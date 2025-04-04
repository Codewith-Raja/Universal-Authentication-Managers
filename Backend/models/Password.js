import mongoose from "mongoose";

// Define the password schema
const PasswordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    website: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true } // Encrypted password
});

// Use existing model if it exists, otherwise create a new one
const PasswordModel = mongoose.models.Password || mongoose.model("Password", PasswordSchema);
export default PasswordModel;
