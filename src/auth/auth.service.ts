import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePasswordHelpers } from 'src/helpers/util';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    const isValidatePassword = await comparePasswordHelpers(
      pass,
      user?.password ?? '',
    );
    if (!isValidatePassword) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user?._id, username: user?.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
