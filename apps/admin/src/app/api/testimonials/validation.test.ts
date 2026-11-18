import { describe, expect, it } from "vitest";
import { parseTestimonialInput } from "./validation";

const validInput = {
  name: " Reviewer ",
  product: " Keyboard ",
  rating: 5,
  text: " Great purchase ",
  date: "2026-11-05",
  image_url: "https://images.example/review.jpg",
  is_active: true,
  order: 10,
};

describe("parseTestimonialInput", () => {
  it("normalizes optional blank fields to null and trims text", () => {
    expect(
      parseTestimonialInput({
        ...validInput,
        name: " ",
        product: "",
        image_url: "",
      })
    ).toMatchObject({
      success: true,
      data: {
        name: null,
        product: null,
        image_url: null,
        text: "Great purchase",
      },
    });
  });

  it.each([0, 6, 1.2, "5"])("rejects invalid rating %s", (rating) => {
    expect(parseTestimonialInput({ ...validInput, rating }).success).toBe(
      false
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "/relative/photo.png",
    "not-a-url",
  ])("rejects unsafe image URL %s", (image_url) => {
    expect(parseTestimonialInput({ ...validInput, image_url }).success).toBe(
      false
    );
  });

  it.each(["", " ", "x".repeat(41)])("rejects invalid date %s", (date) => {
    expect(parseTestimonialInput({ ...validInput, date }).success).toBe(false);
  });

  it("allows partial updates while rejecting an empty patch", () => {
    expect(parseTestimonialInput({ is_active: false }, true)).toEqual({
      success: true,
      data: { is_active: false },
    });
    expect(parseTestimonialInput({}, true)).toEqual({
      success: false,
      error: "At least one field is required",
    });
  });
});
