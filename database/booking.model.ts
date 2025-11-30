import { Schema, model, models, Document, Model, Types } from "mongoose";
import { Event } from "./event.model";

/**
 * Public attributes required to create a Booking.
 */
export interface BookingAttributes {
  eventId: Types.ObjectId;
  email: string;
}

/**
 * Booking document in MongoDB (includes timestamps and MongoDB metadata).
 */
export interface BookingDocument extends BookingAttributes, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingModel extends Model<BookingDocument> {}

/**
 * Simple but strict email format validator.
 */
const isValidEmail = (value: string): boolean => {
  // RFC 5322-compliant regex would be longer; this is a pragmatic balance.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const bookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, // auto-manage createdAt and updatedAt
    strict: true,
  },
);

// Index eventId for efficient lookups by event.
bookingSchema.index({ eventId: 1 });

/**
 * Pre-save hook: validate email and ensure referenced event exists.
 *
 * Promise-based middleware keeps the typings simple and lets Mongoose
 * handle errors from thrown exceptions or rejected promises.
 */
bookingSchema.pre<BookingDocument>("save", async function preSave() {
  if (!this.eventId) {
    throw new Error('Field "eventId" is required.');
  }

  if (typeof this.email !== "string" || this.email.trim().length === 0) {
    throw new Error('Field "email" is required and must be a non-empty string.');
  }

  if (!isValidEmail(this.email)) {
    throw new Error('Field "email" must be a valid email address.');
  }

  // Ensure that the referenced Event exists before creating the booking.
  const eventExists = await Event.exists({ _id: this.eventId }).lean();
  if (!eventExists) {
    throw new Error('Cannot create booking: referenced event does not exist.');
  }
});

export const Booking: BookingModel =
  (models.Booking as BookingModel | undefined) ||
  model<BookingDocument, BookingModel>("Booking", bookingSchema);
