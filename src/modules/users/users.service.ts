import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { hashPasswordHelpers } from 'src/helpers/util';
import aqp from 'api-query-params';
import {
  ChangePasswordDto,
  CodeAuthDto,
  CreateAuthDto,
} from 'src/auth/dto/create-auth.dto';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly mailerService: MailerService,
  ) {}

  isEmailExist = async (email: string) => {
    const user = await this.userModel.exists({ email });
    if (user) return true;
    return false;
  };

  async create(createUserDto: CreateUserDto) {
    //check email exist
    const isExistEmail = await this.isEmailExist(createUserDto.email);
    if (isExistEmail) {
      throw new BadRequestException(
        `email ${createUserDto.email} đã được sử dụng`,
      );
    }

    // hash pw: use bcrypt
    const hashPassword = await hashPasswordHelpers(createUserDto.password);
    const user = await this.userModel.create({
      ...createUserDto,
      password: hashPassword,
    });
    return {
      _id: user._id,
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);
    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;

    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (current - 1) * pageSize;

    const results = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .select('-password')
      .sort(sort as any);
    return { results, totalPages };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto },
      { ...updateUserDto },
    );
  }

  remove(_id: string) {
    //check _id
    if (mongoose.isValidObjectId(_id)) {
      //delete
      return this.userModel.deleteOne({ _id });
    } else {
      throw new BadRequestException('id không đúng định dạng mongoDB');
    }
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { name, email, password } = registerDto;
    //check email exist
    const isExistEmail = await this.isEmailExist(email);
    if (isExistEmail) {
      throw new BadRequestException(`email ${email} đã được sử dụng`);
    }

    // hash pw: use bcrypt
    const hashPassword = await hashPasswordHelpers(password);
    const codeId = uuidv4();
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      isActive: false,
      codeId: codeId,
      codeExpried: dayjs().add(5, 'minute'),
    });
    // send email verify
    await this.mailerService.sendMail({
      // to: user.email, // list of receivers
      to: 'vu.hieu22102001@gmail.com', //mail to debug code email
      subject: 'Activate your account ✔', // Subject line
      text: 'welcome', // plaintext body
      template: 'register.hbs',
      context: {
        name: user.name ?? user.email,
        activationCode: codeId,
      },
    });
    //return for client
    return {
      _id: user._id,
    };
  }

  async handleActive(data: CodeAuthDto) {
    const user = await this.userModel.findOne({
      _id: data._id,
      codeId: data.code,
    });

    if (!user) {
      throw new BadRequestException('mã code không hợp lệ hoặc đã hết hạn');
    }

    // check expried code
    const isBeforeCheck = dayjs().isBefore(dayjs(user.codeExpried));

    if (isBeforeCheck) {
      // valid => update isActive account

      await this.userModel.updateOne(
        {
          _id: data._id,
        },
        { isActive: true },
      );
      return isBeforeCheck;
    } else {
      throw new BadRequestException('mã code đã hết hạn');
    }
  }

  async handleRetryActive(email: string) {
    const user = await this.userModel.findOne({ email });
    const codeId = uuidv4();
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    if (user.isActive) {
      throw new BadRequestException('Email đã được kích hoạt');
    }

    await user.updateOne({
      codeId: codeId,
      codeExpried: dayjs().add(5, 'minute'),
    });

    //send email
    await this.mailerService.sendMail({
      // to: user.email, // list of receivers
      to: 'vu.hieu22102001@gmail.com', //mail to debug code email
      subject: 'Activate your account ✔', // Subject line
      text: 'welcome', // plaintext body
      template: 'register.hbs',
      context: {
        name: user.name ?? user.email,
        activationCode: codeId,
      },
    });
    return { _id: user._id };
  }

  async handleRetryPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    const codeId = uuidv4();
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    await user.updateOne({
      codeId: codeId,
      codeExpried: dayjs().add(5, 'minute'),
    });

    //send email
    await this.mailerService.sendMail({
      // to: user.email, // list of receivers
      to: 'vu.hieu22102001@gmail.com', //mail to debug code email
      subject: 'Change your password account ✔', // Subject line
      text: 'welcome', // plaintext body
      template: 'register.hbs',
      context: {
        name: user.name ?? user.email,
        activationCode: codeId,
      },
    });
    return { _id: user._id, email: user.email };
  }

  async handleChangePassword(data: ChangePasswordDto) {
    if (data.confirmPassword !== data.password) {
      throw new BadRequestException(
        'Mật khẩu/Xác nhận mật khẩu không chính xác',
      );
    }

    const user = await this.userModel.findOne({ email: data.email });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }

    // check expried code
    const isBeforeCheck = dayjs().isBefore(dayjs(user.codeExpried));

    if (isBeforeCheck) {
      // valid => update password
      const newPassword = await hashPasswordHelpers(data.password);
      await user.updateOne({ password: newPassword });
      return isBeforeCheck;
    } else {
      throw new BadRequestException('mã code đã hết hạn');
    }
  }
}
