import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { hashPasswordHelpers } from 'src/helpers/util';
import aqp from 'api-query-params';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
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
      codeExpried: dayjs().add(30, 'seconds'),
    });
    // send email verify
    void this.mailerService.sendMail({
      to: user.email, // list of receivers
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
}
