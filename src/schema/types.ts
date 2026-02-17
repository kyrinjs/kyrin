import { z } from "zod";

// Base type that all types inherit from
abstract class BaseType<T extends z.ZodTypeAny> {
  constructor(protected _zod: T) {}

  optional() {
    return new OptionalType(this._zod.optional());
  }
  default<V extends z.output<T>>(value: V) {
    return new DefaultType(
      this._zod.default(value as z.util.NoUndefined<z.output<T>>)
    );
  }
  array() {
    return new ArrayType(this._zod.array());
  }
  nullable() {
    return new NullableType(this._zod.nullable());
  }
  pk() {
    return new PrimaryKeyType(this._zod);
  }
  get zod() {
    return this._zod;
  }
}

// Implementations
export class StringType extends BaseType<z.ZodString> {
  constructor() {
    super(z.string());
  }
}

export class NumberType extends BaseType<z.ZodNumber> {
  constructor() {
    super(z.number());
  }
}

export class BooleanType extends BaseType<z.ZodBoolean> {
  constructor() {
    super(z.boolean());
  }
}

export class DateType extends BaseType<z.ZodDate> {
  constructor() {
    super(z.date());
  }
}

// Wrapper Types (returned by modifier methods)
export class PrimaryKeyType<T extends z.ZodTypeAny> extends BaseType<T> {
  constructor(zod: T) {
    super(zod);
  }
  get isPrimaryKey() {
    return true;
  }
}

export class OptionalType<T extends z.ZodTypeAny> extends BaseType<
  z.ZodOptional<T>
> {
  constructor(zod: z.ZodOptional<T>) {
    super(zod);
  }
}

export class DefaultType<T extends z.ZodTypeAny> extends BaseType<
  z.ZodDefault<T>
> {
  constructor(zod: z.ZodDefault<T>) {
    super(zod);
  }
}

export class ArrayType<T extends z.ZodTypeAny> extends BaseType<z.ZodArray<T>> {
  constructor(zod: z.ZodArray<T>) {
    super(zod);
  }
}

export class NullableType<T extends z.ZodTypeAny> extends BaseType<
  z.ZodNullable<T>
> {
  constructor(zod: z.ZodNullable<T>) {
    super(zod);
  }
}

// Re-export BaseType for use in Model
export { BaseType };
