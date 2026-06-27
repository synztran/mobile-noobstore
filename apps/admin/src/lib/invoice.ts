import { getAdminClient } from "@/lib/supabase/admin";
import https from "https";

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_cost: number;
}

interface GenerateInvoiceInput {
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  items: InvoiceItem[];
  shippingFee: number;
  discount: number;
  total: number;
}

export async function generateAndStoreInvoice(
  orderId: string,
  input: GenerateInvoiceInput
): Promise<string | null> {
  const apiKey = process.env.INVOICE_API_KEY;
  if (!apiKey) {
    console.error("[invoice] INVOICE_API_KEY not set");
    return null;
  }

  const payload = {
    logo: "https://drive.google.com/uc?export=view&id=10Ww03d9N7tglvTmkBV5cuOi1ISye9Vcg",
    from: "NoobStore\n70 47 st, Hiep Binh Chanh ward, Thu Duc district\nHo Chi Minh, Vietnam 700000",
    to: `${input.customerName}\n${input.customerAddress}`,
    currency: "vnd",
    number: input.orderNumber,
    payment_terms: "Auto-Billed - Do Not Pay",
    date: new Date().toLocaleDateString("vi-VN"),
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    })),
    fields: {
      tax: "%",
      discounts: "%",
      shipping: true,
    },
    discounts: input.discount,
    shipping: input.shippingFee,
    tax: 0,
    amount_paid: input.total,
    notes: "Billing from NoobStore",
    terms: "Payment is due within 3 days.",
  };

  console.log(payload);

  try {
    const postData = JSON.stringify(payload);

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "invoice-generator.com",
          port: 443,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
            Authorization: "Bearer " + apiKey,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(buffer);
            } else {
              const text = buffer.toString("utf8");
              console.error(`[invoice] API error ${res.statusCode}: ${text}`);
              reject(new Error(`API error ${res.statusCode}`));
            }
          });
        }
      );
      req.on("error", reject);
      req.write(postData);
      req.end();
    });

    const supabase = getAdminClient();
    const bucket = "invoices";
    const storagePath = `${input.orderNumber}.pdf`;

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucket);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        bucket,
        { public: true }
      );
      if (createError) {
        console.error(
          `[invoice] Failed to create bucket: ${createError.message}`
        );
        return null;
      }
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[invoice] Upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const invoiceUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("orders")
      .update({ invoice_url: invoiceUrl })
      .eq("id", orderId);

    if (updateError) {
      console.error(`[invoice] Failed to update order: ${updateError.message}`);
    }

    return invoiceUrl;
  } catch (err) {
    console.error("[invoice] Unexpected error:", err);
    return null;
  }
}
