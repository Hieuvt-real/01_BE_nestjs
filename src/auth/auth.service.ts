/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePasswordHelpers } from 'src/helpers/util';
import { UsersService } from 'src/modules/users/users.service';
import { ChangePasswordDto, CodeAuthDto, CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    if (!user) return null;
    const isValidatePassword = await comparePasswordHelpers(
      pass,
      user?.password ?? '',
    );

    if (!isValidatePassword) return null;

    return user;
  }

  async login(user: any) {
    const payload = { sub: user?._id, username: user?.email };
    return {
      user: {
        email: user.email,
        _id: user._id,
        name: user.name,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(registerDto: CreateAuthDto) {
    return await this.usersService.handleRegister(registerDto);
  }

  async checkCode(data: CodeAuthDto) {
    return await this.usersService.handleActive(data);
  }

  async retryActive(email: string) {
    return await this.usersService.handleRetryActive(email);
  }

  async retryPassword(email: string) {
    return await this.usersService.handleRetryPassword(email);
  }

  async changePassword(data: ChangePasswordDto) {
    return await this.usersService.handleChangePassword(data);
  }
}
