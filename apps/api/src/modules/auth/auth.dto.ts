import type { StaffRole, StaffSession, StaffUser } from "@floodaid/contracts";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, MaxLength } from "class-validator";
import { normalizeStaffEmail } from "./staff-password";
import { staffRoles } from "./staff-session";

export class StaffLoginDto {
  @ApiProperty({ format: "email", maxLength: 254 })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? normalizeStaffEmail(value) : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ format: "password", writeOnly: true, maxLength: 128 })
  @IsString()
  @Length(1, 128)
  password!: string;
}

class StaffUserDto implements StaffUser {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: staffRoles })
  role!: StaffRole;
}

export class StaffSessionDto implements StaffSession {
  @ApiProperty({ type: StaffUserDto })
  user!: StaffUserDto;

  @ApiProperty({ format: "date-time" })
  expiresAt!: string;
}
