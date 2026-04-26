import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import app from "./app";
import connectDB from "./db/connect";

connectDB()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    })
    .catch((err: unknown) => {
        console.log(`MONGODB connection failed: `, err);
    });
