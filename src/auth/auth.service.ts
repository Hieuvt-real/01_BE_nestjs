/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePasswordHelpers } from 'src/helpers/util';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    const isValidatePassword = await comparePasswordHelpers(
      pass,
      user?.password ?? '',
    );

    if (!user || !isValidatePassword) return null;

    return user;
  }

  async login(user: any) {
    const payload = { sub: user?._id, username: user?.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
