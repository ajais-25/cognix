import { NextRequest } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { sendPaymentFailedEmail } from "@/helpers/sendPaymentFailedEmail";
import User from "@/models/User";
import CreditTransaction from "@/models/CreditTransaction";
import { sendPaymentSuccessfulEmail } from "@/helpers/sendPaymentSuccessfulEmail";

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return Response.json(
        {
          success: false,
          message: "Invalid signature",
        },
        { status: 400 },
      );
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      console.log("payment", payment);

      const order = await Order.findOneAndUpdate(
        { orderId: payment.order_id, status: "pending" },
        {
          paymentId: payment.id,
          status: "completed",
        },
      );

      if (order) {
        const creditsToInc = Math.round(order.amount / 10);
        const user = await User.findByIdAndUpdate(
          order.userId,
          { $inc: { credits: creditsToInc } },
          { new: true }
        );

        if (user) {
          await CreditTransaction.create({
            userId: order.userId,
            amount: creditsToInc,
            type: "topup",
            balanceAfter: user.credits,
          });

          await sendPaymentSuccessfulEmail(
            user.name,
            user.email,
            String(order.amount / 100),
            "INR",
            order.orderId,
            creditsToInc,
          );
        }
      }
    } else if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;

      console.log("payment", payment);

      const order = await Order.findOneAndUpdate(
        { orderId: payment.order_id, status: "pending" },
        {
          paymentId: payment.id,
          status: "failed",
        },
      );

      console.log("Payment failed for order:", payment.order_id);

      if (order) {
        const user = await User.findById(order.userId).select("-password");

        if (user) {
          await sendPaymentFailedEmail(
            user.name,
            user.email,
            String(order.amount / 100),
            "INR",
            order.orderId,
            `${process.env.NEXT_PUBLIC_BASE_URL!}/credits`,
          );
        }
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return Response.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
