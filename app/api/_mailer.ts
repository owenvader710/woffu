import { Resend } from "resend";

export async function sendInviteEmail({
  to,
  inviteLink,
}: {
  to: string;
  inviteLink: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    throw new Error("Missing INVITE_FROM_EMAIL");
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "คุณได้รับคำเชิญเข้าร่วม WOFFU",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>คุณได้รับคำเชิญเข้าร่วม WOFFU</h2>
        <p>กดปุ่มด้านล่างเพื่อสร้างบัญชีของคุณ</p>
        <p>
          <a href="${inviteLink}" style="display:inline-block;background:#e5ff78;color:#000;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
            สร้างบัญชี
          </a>
        </p>
        <p>หรือลิงก์นี้:</p>
        <p>${inviteLink}</p>
        <p>ลิงก์นี้จะหมดอายุภายใน 48 ชั่วโมง</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}