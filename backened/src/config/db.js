const mongoose = require("mongoose");

function connectToDB() {
    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI is missing from .env file!");
        return;
    }

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("✅ Successfully connected to MongoDB Database");
        })
        .catch(err => {
            console.error("\n❌ Error connecting to MongoDB:", err.message);
            if (err.name === 'MongooseServerSelectionError') {
                console.error("\n💡 SOLUTION: MongoDB Atlas is blocking your current IP address.");
                console.error("   Either:");
                console.error("   1) Ask the cluster owner to add '0.0.0.0/0' (Allow Access from Anywhere) in MongoDB Atlas -> Network Access.");
                console.error("   2) Or create your own free cluster at https://www.mongodb.com/cloud/atlas and update MONGO_URI in .env.");
                console.error("   3) Or run MongoDB locally and set MONGO_URI=mongodb://127.0.0.1:27017/bank_ledger in .env\n");
            }
        });
}

module.exports = connectToDB;
