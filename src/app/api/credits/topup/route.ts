import { getDataFromToken } from "@/helpers/getDataFromToken";
import dbConnect from "@/lib/dbConnect";
import { razorpay } from "@/lib/razorpay";
import Order from "@/models/Order";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const userId = getDataFromToken(request);

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized - Invalid or expired token",
                },
                { status: 401 },
            );
        }

        await dbConnect();

        const user = await User.findById(userId).select("-password");

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized user",
                },
                { status: 401 },
            );
        }

        const { amount } = await request.json();

        if (!amount) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Amount is required",
                },
                { status: 400 },
            );
        }

        if (amount < 100) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Minimum amount is 100",
                },
                { status: 400 },
            );
        }

        // create razorpay order
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `receipt-${Date.now()}`,
            notes: {
                userId: userId.toString(),
                amount: (amount * 100).toString(),
            },
        });

        const newOrder = await Order.create({
            userId: user._id,
            orderId: order.id,
            amount: Math.round(amount * 100),
            status: "pending",
        });

        return Response.json(
            {
                success: true,
                data: {
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    dbOrderId: newOrder._id,
                },
                message: "Order created",
            },
            { status: 201 },
        );
    } catch (error) {
        console.log("Error in credits topup route", error);

        return NextResponse.json(
            {
                success: false,
                message: "Error occured while fetching credits",
            },
            { status: 500 },
        );
    }
}