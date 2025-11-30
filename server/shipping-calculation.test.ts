import { describe, it, expect } from "vitest";
import { computeShippingForLineItem } from "./profit-calculator";

describe("Shipping Calculation", () => {
  it("should calculate shipping cost for US Standard shipping", () => {
    const item = {
      variant_id: "12345",
      quantity: 2,
    };

    const shippingConfig = {
      "12345": {
        currency: "USD",
        rates: {
          US: {
            Standard: {
              "1": 5,
              "2": 8,
              "3": 11,
            },
            Express: {
              "1": 15,
              "2": 25,
            },
          },
          EU: {
            Standard: {
              "1": 6,
              "2": 10,
            },
          },
          CA: {
            Standard: {
              "1": 7,
              "2": 12,
            },
          },
        },
      },
    };

    const cost = computeShippingForLineItem(item, "USA", "free", shippingConfig, 1.15);
    expect(cost).toBe(8); // 2 items, Standard shipping to US = $8
  });

  it("should calculate shipping cost for EU Standard shipping", () => {
    const item = {
      variant_id: "12345",
      quantity: 1,
    };

    const shippingConfig = {
      "12345": {
        currency: "USD",
        rates: {
          US: {
            Standard: {
              "1": 5,
            },
          },
          EU: {
            Standard: {
              "1": 6,
              "2": 10,
            },
          },
        },
      },
    };

    const cost = computeShippingForLineItem(item, "EU", "free", shippingConfig, 1.15);
    expect(cost).toBe(6); // 1 item, Standard shipping to EU = $6
  });

  it("should calculate shipping cost for Express shipping", () => {
    const item = {
      variant_id: "12345",
      quantity: 1,
    };

    const shippingConfig = {
      "12345": {
        currency: "USD",
        rates: {
          US: {
            Standard: {
              "1": 5,
            },
            Express: {
              "1": 15,
              "2": 25,
            },
          },
        },
      },
    };

    const cost = computeShippingForLineItem(item, "USA", "express", shippingConfig, 1.15);
    expect(cost).toBe(15); // 1 item, Express shipping to US = $15
  });

  it("should convert EUR shipping costs to USD", () => {
    const item = {
      variant_id: "12345",
      quantity: 1,
    };

    const shippingConfig = {
      "12345": {
        currency: "EUR",
        rates: {
          EU: {
            Standard: {
              "1": 10, // €10
            },
          },
        },
      },
    };

    const exchangeRate = 1.15; // 1 EUR = 1.15 USD
    const cost = computeShippingForLineItem(item, "EU", "free", shippingConfig, exchangeRate);
    expect(cost).toBe(11.5); // €10 * 1.15 = $11.50
  });

  it("should handle quantity above configured range", () => {
    const item = {
      variant_id: "12345",
      quantity: 5, // More than configured
    };

    const shippingConfig = {
      "12345": {
        currency: "USD",
        rates: {
          US: {
            Standard: {
              "1": 5,
              "2": 8,
              "3": 11,
            },
          },
        },
      },
    };

    const cost = computeShippingForLineItem(item, "USA", "free", shippingConfig, 1.15);
    // Should use greedy algorithm: 3 + 2 = 11 + 8 = 19
    expect(cost).toBe(19);
  });

  it("should return 0 for missing shipping config", () => {
    const item = {
      variant_id: "99999", // Not configured
      quantity: 1,
    };

    const shippingConfig = {
      "12345": {
        currency: "USD",
        rates: {
          US: {
            Standard: {
              "1": 5,
            },
          },
        },
      },
    };

    const cost = computeShippingForLineItem(item, "USA", "free", shippingConfig, 1.15);
    expect(cost).toBe(0);
  });

  it("should handle old config format without currency", () => {
    const item = {
      variant_id: "12345",
      quantity: 1,
    };

    // Old format: directly country/method/quantity
    const shippingConfig = {
      "12345": {
        US: {
          Standard: {
            "1": 5,
          },
        },
      },
    };

    const cost = computeShippingForLineItem(item, "USA", "free", shippingConfig, 1.15);
    expect(cost).toBe(5); // Should still work with old format
  });
});
