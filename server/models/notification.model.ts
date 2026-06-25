import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  status: string;
  userId: string;
}

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      title: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "unread",
    },
  },
  { timestamps: true },
);

const Notification: Model<INotification> = mongoose.model(
  "Notification",
  notificationSchema,
);

export default Notification