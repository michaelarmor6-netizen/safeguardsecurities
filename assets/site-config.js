/**
 * Single source for site-wide contact details and footer nav links.
 * Edit this file, deploy hosting — no need to touch every HTML page.
 */
(function (global) {
  "use strict";

  global.SG_SITE_CONFIG = {
    contact: {
      phoneDisplay: "+1 216 250 7891",
      phoneTel: "+12162507891",
      additionalPhoneDisplay: "+1 937 982 1491",
      additionalPhoneTel: "+19379821491",
      email: "support@safeguardsecurities.us",
      address: "6060 Parkland Boulevard, Suite 200, Mayfield Heights, OH 44124"
    },

    footerSections: {
      PRODUCT: [
        { label: "Features", href: "/services/index.html" },
        { label: "Pricing", href: "/faq-brokerage-fees/index.html" },
        {
          label: "Create a free account",
          href: "https://app.safeguardsecurities.us/register"
        },
        { label: "Privacy Policy & GDPR", href: "/privacy-policy/index.html" },
        { label: "Terms of Service", href: "/terms-of-service/index.html" }
      ],

      COMPANY: [
        { label: "About Us", href: "/about/index.html" },
        { label: "Contact & Support", href: "/contact/index.html" },
        { label: "Success History", href: "/testimonial/index.html" },
        { label: "Setting & Privacy", href: "/privacy-policy/index.html" },
        { label: "Contact Us", href: "/contact/index.html" }
      ],

      SUPPORT: [
        { label: "Support", href: "/contact/index.html" },
        { label: "Knowledge Base", href: "/faq/index.html" },
        { label: "Webinars", href: "/investing-essentials/index.html" },
        { label: "API Documentation", href: "/fintech-services/index.html" },
        {
          label: "Log In",
          href: "https://app.safeguardsecurities.us/login"
        }
      ],

      RESOURCES: [
        { label: "API reference", href: "/fintech-services/index.html" },
        { label: "Status", href: "/about/index.html" },
        { label: "Get help", href: "/faq/index.html" },
        { label: "Brand assets", href: "/about/index.html" },
        { label: "Fintech Services", href: "/fintech-services/index.html" }
      ]
    }
  };
})(typeof window !== "undefined" ? window : globalThis);