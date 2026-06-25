import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./user.model.js";

interface IComment extends Document {
  user: IUser;
  question: string;
  questionReplies?: IComment[];
}

interface IReview extends Document {
  user: IUser;
  rating: number;
  comment: string;
  commentReplies: IComment[];
}

interface ILink extends Document {
  title: string;
  url: string;
}

interface ICourseData extends Document {
  title: string;
  description: string;
  vedioUrl: string;
  vedioThumbnail: object;
  vedioSection: string;
  vedioLength: number;
  vedioPlayer: string;
  links: ILink[];
  suggestion: string;
  questions: IComment[];
}

interface ICourse extends Document {
  name: string;
  description: string;
  price: number;
  estimatedPrice?: number;
  thumbnail: object;
  tags: string;
  level: string;
  demoUrl: string;
  prerequisites: { title: string }[];
  benefits: { title: string }[];
  reviews: IReview[];
  courseData: ICourseData[];
  ratings?: number;
  purchased?: number;
}

const reviewSchema = new Schema<IReview>({
  user: Object,
  rating: {
    type: Number,
    default: 0,
  },
  comment: String,
  commentReplies: [Object],
});

const linkSchema = new Schema<ILink>({
  title: String,
  url: String,
});

const commentSchema = new Schema<IComment>({
  user: Object,
  question: String,
  questionReplies: [Object],
});

const courseDataSchema = new Schema<ICourseData>({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  vedioUrl: {
    type: String,
    required: true,
  },
  vedioThumbnail: {
    type: Object,
    required: true,
  },
  vedioSection: {
    type: String,
    required: true,
  },
  vedioLength: {
    type: Number,
    required: true,
  },
  vedioPlayer: {
    type: String,
    required: true,
  },
  links: [linkSchema],
  suggestion: {
    type: String,
    required: true,
  },
  questions: [commentSchema],
});

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    estimatedPrice: {
      type: Number,
    },
    thumbnail: {
      type: Object,
      required: true,
    },
    tags: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    demoUrl: {
      type: String,
      required: true,
    },
    prerequisites: [
      {
        title: String,
      },
    ],
    benefits: [
      {
        title: String,
      },
    ],
    reviews: [reviewSchema],
    courseData: [courseDataSchema],
    ratings: {
      type: Number,
      default: 0,
    },
    purchased: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model<ICourse>("Course", courseSchema);

export default Course;