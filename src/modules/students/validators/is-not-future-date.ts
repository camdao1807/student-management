import { registerDecorator, ValidationOptions } from 'class-validator';

export const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

export function IsNotFutureDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const d = new Date(value);
          return !isNaN(d.getTime()) && value <= todayStr();
        },
        defaultMessage: () => 'Ngày sinh không được nằm trong tương lai',
      },
    });
}
