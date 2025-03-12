/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as bcrypt from 'bcrypt';

const saltRounds = 10;

export const hashPasswordHelpers = async (plainPassword: string) => {
  try {
    const hashedPassword: string = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.log(error);
  }
};

export const comparePasswordHelpers = async (
  plainPassword: string,
  hashedPassword: string,
) => {
  try {
    const comparePassword: boolean = await bcrypt.compare(
      plainPassword,
      hashedPassword,
    );
    return comparePassword;
  } catch (error) {
    console.log(error);
  }
};
