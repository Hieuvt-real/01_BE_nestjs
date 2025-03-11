import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'name không được để trống' })
  name: string;

  @IsNotEmpty({ message: 'email không được để trống' })
  @IsEmail({}, { message: 'email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'pw không được để trống' })
  password: string;

  phone: string;
  address: string;
  image: string;
}
