import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class CreateCheckinDto {
  // Aceita "111.111.111-11" ou "11111111111": guarda só os dígitos.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString({ message: 'Informe o CPF.' })
  @Matches(/^\d{11}$/, { message: 'O CPF deve ter 11 dígitos.' })
  cpf: string;
}
