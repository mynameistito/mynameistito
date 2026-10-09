import type { Schema } from "effect";
import {
  check,
  isMaxLength,
  isMinLength,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

/** Parsed message submitted through the website contact form. */
const ContactMessageSchema = Struct({
  name: SchemaString.pipe(check(isMinLength(1), isMaxLength(120))),
  email: SchemaString.pipe(
    check(
      isMaxLength(254),
      isPattern(/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,63}$/u)
    )
  ),
  message: SchemaString.pipe(check(isMinLength(1), isMaxLength(5000))),
  company: SchemaString,
});

/** Parsed contact submission, including its Turnstile token. */
export const ContactSubmissionSchema = Struct({
  message: ContactMessageSchema,
  turnstileToken: SchemaString,
});

/** The contact-form values after boundary decoding. */
export type ContactMessage = Schema.Schema.Type<typeof ContactMessageSchema>;
