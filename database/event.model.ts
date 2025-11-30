import { Schema, model, models, Document, Model } from "mongoose";

/**
 * Public attributes required to create an Event.
 */
export interface EventAttributes {
  title: string;
  slug?: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // stored as ISO-8601 date-only string (e.g. 2025-01-31)
  time: string; // stored as 24h HH:MM string
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
}

/**
 * Event document in MongoDB (includes timestamps and MongoDB metadata).
 */
export interface EventDocument extends EventAttributes, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface EventModel extends Model<EventDocument> {}

/**
 * Generate a URL-friendly slug from a title.
 */
const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
};

/**
 * Validate that a string field is present and non-empty.
 */
const assertNonEmptyString = (value: unknown, fieldName: string): void => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Field "${fieldName}" is required and must be a non-empty string.`);
  }
};

/**
 * Validate that an array of strings is present and non-empty.
 */
const assertNonEmptyStringArray = (value: unknown, fieldName: string): void => {
  if (!Array.isArray(value) || value.length === 0 || value.some(v => typeof v !== "string" || v.trim().length === 0)) {
    throw new Error(`Field "${fieldName}" is required and must be a non-empty array of strings.`);
  }
};

const eventSchema = new Schema<EventDocument, EventModel>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  {
    timestamps: true, // auto-manage createdAt and updatedAt
    strict: true, // ignore fields not in the schema
  },
);

/**
 * Pre-save hook: validate required fields, normalize date/time, and generate slug.
 *
 * Using promise-based middleware avoids the need for an explicit `next` callback
 * and plays nicely with TypeScript typings.
 */
eventSchema.pre<EventDocument>("save", function preSave() {
  // Validate required string fields.
  assertNonEmptyString(this.title, "title");
  assertNonEmptyString(this.description, "description");
  assertNonEmptyString(this.overview, "overview");
  assertNonEmptyString(this.image, "image");
  assertNonEmptyString(this.venue, "venue");
  assertNonEmptyString(this.location, "location");
  assertNonEmptyString(this.date, "date");
  assertNonEmptyString(this.time, "time");
  assertNonEmptyString(this.mode, "mode");
  assertNonEmptyString(this.audience, "audience");
  assertNonEmptyString(this.organizer, "organizer");

  // Validate arrays.
  assertNonEmptyStringArray(this.agenda, "agenda");
  assertNonEmptyStringArray(this.tags, "tags");

  // Normalize and validate the date into ISO-8601 (date-only) format.
  const parsedDate = new Date(this.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Invalid "date" value. Expected a parsable date string.');
  }
  // Store as YYYY-MM-DD to keep format consistent across documents.
  this.date = parsedDate.toISOString().slice(0, 10);

  // Normalize and validate time as 24-hour HH:MM.
  const time = this.time.trim();
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error('Invalid "time" value. Expected format HH:MM in 24-hour time.');
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid "time" value. Hours must be 0-23 and minutes 0-59.');
  }
  // Store with zero-padded HH:MM for consistency.
  this.time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  // Generate or update the slug only when the title changes.
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title);
  }
});

// Additional safeguard: unique index on slug to enforce uniqueness at the DB level.
eventSchema.index({ slug: 1 }, { unique: true });

export const Event: EventModel =
  (models.Event as EventModel | undefined) || model<EventDocument, EventModel>("Event", eventSchema);
