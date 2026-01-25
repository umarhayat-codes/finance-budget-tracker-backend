import { Request, Response } from "express";
import prisma from "../prisma";

export const saveProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      userId,
      phoneNumber,
      dateOfBirth,
      paymentMethod,
      cardNumber,
      billingAddress,
    } = req.body;

    if (!userId) {
      res.status(400).json({ message: "UserId is required" });
      return;
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        phoneNumber,
        dateOfBirth,
        paymentMethod,
        cardNumber,
        billingAddress,
      },
      create: {
        userId,
        phoneNumber,
        dateOfBirth,
        paymentMethod,
        cardNumber,
        billingAddress,
      },
    });

    res
      .status(200)
      .json({ message: "Profile saved successfully", data: profile });
  } catch (error) {
    console.error("SaveProfile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ message: "UserId is required" });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    res.status(200).json({ data: profile });
  } catch (error) {
    console.error("GetProfile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
