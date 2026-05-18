export const baseTemplate = (content: string, ctaLink: string, ctaText: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { padding: 24px 32px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; color: #0f172a; text-decoration: none; }
    .logo span { color: #f97316; }
    .divider { height: 4px; background: #f97316; width: 100%; }
    .content { padding: 32px; font-size: 16px; color: #334155; line-height: 1.6; }
    .button-container { text-align: center; margin-top: 32px; margin-bottom: 16px; }
    .button { display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; }
    .footer { padding: 24px; text-align: center; font-size: 13px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="#" class="logo">Equilibrium<span>.</span></a>
    </div>
    <div class="divider"></div>
    <div class="content">
      ${content}
      <div class="button-container">
        <a href="${ctaLink}" class="button">${ctaText}</a>
      </div>
    </div>
    <div class="footer">
      Equilibrium Portal · Equilibrium Technologies
    </div>
  </div>
</body>
</html>
`;
