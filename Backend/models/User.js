import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    recoveryEmail: { type: String },
    twoFactorEnabled: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent Mongoose from recompiling the model
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
