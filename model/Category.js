const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: true,
            maxlength: 32,
            unique: true
        },
        createdAt{
          type: Date,
          default: Date.now
        }
    },
    
);

module.exports = mongoose.model("Category", categorySchema);