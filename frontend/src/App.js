import React, { useEffect, useRef, useState } from "react";

// -- Google Fonts -------------------------------------------------------------
const FONTS =
  "https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap";

// -- Service Categories -------------------------------------------------------
const CATEGORIES = [
  {
    id: "cleaners",
    icon: "🧹",
    name: "Cleaners & House Help",
    subs: [
      "Domestic Cleaning",
      "Commercial Cleaning",
      "Deep Cleaning",
      "End of Tenancy",
    ],
  },
  {
    id: "chef",
    icon: "👨‍🍳",
    name: "Private Chef & Catering",
    subs: ["Private Chef", "Event Catering", "Meal Prep"],
  },
  {
    id: "drivers",
    icon: "🚗",
    name: "Drivers & Van Hire",
    subs: ["Personal Driver", "Van Hire", "Airport Transfer"],
  },
  {
    id: "events",
    icon: "🎉",
    name: "Event Staff",
    subs: ["Waiters", "Bouncers", "Bartenders", "Hosts"],
  },
  {
    id: "movers",
    icon: "📦",
    name: "Packers & Movers",
    subs: ["House Move", "Office Move", "Storage"],
  },
  {
    id: "trades",
    icon: "🔧",
    name: "Trades",
    subs: ["Plumbing", "Electrical", "Carpentry", "Maintenance"],
  },
  {
    id: "warehouse",
    icon: "🏭",
    name: "Warehouse & Forklift",
    subs: ["Forklift Operator", "Warehouse Staff"],
  },
  {
    id: "carers",
    icon: "❤️",
    name: "Carers",
    subs: ["Elderly Care", "Child Care", "Special Needs"],
  },
  {
    id: "garden",
    icon: "🌿",
    name: "Gardener & DIY",
    subs: ["Gardening", "Landscaping", "DIY Helper"],
  },
  {
    id: "musicians",
    icon: "🎵",
    name: "Musicians & Actors",
    subs: ["Live Music", "DJ", "Actor/Performer"],
  },
  {
    id: "hgv",
    icon: "🚛",
    name: "HGV Drivers",
    subs: ["HGV Class 1", "HGV Class 2"],
  },
  {
    id: "baggage",
    icon: "🧳",
    name: "Baggage Handlers",
    subs: ["Airport Baggage", "Event Luggage"],
  },
];

// -- Mock Providers -----------------------------------------------------------
const PROVIDERS = {
  cleaners: [
    {
      id: 1,
      name: "Sarah M.",
      rating: 4.9,
      reviews: 127,
      price: 18,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "5 yrs",
      img: "SM",
      available: true,
    },
    {
      id: 2,
      name: "James K.",
      rating: 4.7,
      reviews: 89,
      price: 15,
      per: "hr",
      badge: ["Verified"],
      exp: "3 yrs",
      img: "JK",
      available: true,
    },
    {
      id: 3,
      name: "Priya R.",
      rating: 4.8,
      reviews: 203,
      price: 20,
      per: "hr",
      badge: ["Top Rated", "Recommended"],
      exp: "7 yrs",
      img: "PR",
      available: false,
    },
  ],
  chef: [
    {
      id: 4,
      name: "Marco B.",
      rating: 5.0,
      reviews: 56,
      price: 45,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "12 yrs",
      img: "MB",
      available: true,
    },
    {
      id: 5,
      name: "Aisha T.",
      rating: 4.8,
      reviews: 34,
      price: 38,
      per: "hr",
      badge: ["Verified"],
      exp: "8 yrs",
      img: "AT",
      available: true,
    },
  ],
  drivers: [
    {
      id: 6,
      name: "Tom H.",
      rating: 4.9,
      reviews: 312,
      price: 25,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "10 yrs",
      img: "TH",
      available: true,
    },
    {
      id: 7,
      name: "Raj P.",
      rating: 4.6,
      reviews: 145,
      price: 20,
      per: "hr",
      badge: ["Verified"],
      exp: "4 yrs",
      img: "RP",
      available: true,
    },
  ],
  events: [
    {
      id: 8,
      name: "Lia F.",
      rating: 4.8,
      reviews: 78,
      price: 22,
      per: "hr",
      badge: ["Verified"],
      exp: "6 yrs",
      img: "LF",
      available: true,
    },
    {
      id: 9,
      name: "Dan W.",
      rating: 4.7,
      reviews: 55,
      price: 28,
      per: "hr",
      badge: ["Top Rated"],
      exp: "9 yrs",
      img: "DW",
      available: true,
    },
  ],
  movers: [
    {
      id: 10,
      name: "Mike L.",
      rating: 4.9,
      reviews: 156,
      price: 30,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "8 yrs",
      img: "ML",
      available: true,
    },
    {
      id: 11,
      name: "Alex R.",
      rating: 4.6,
      reviews: 92,
      price: 25,
      per: "hr",
      badge: ["Verified"],
      exp: "5 yrs",
      img: "AR",
      available: true,
    },
  ],
  trades: [
    {
      id: 12,
      name: "David P.",
      rating: 4.9,
      reviews: 201,
      price: 35,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "15 yrs",
      img: "DP",
      available: true,
    },
    {
      id: 13,
      name: "Chris M.",
      rating: 4.7,
      reviews: 78,
      price: 28,
      per: "hr",
      badge: ["Verified"],
      exp: "7 yrs",
      img: "CM",
      available: true,
    },
  ],
  warehouse: [
    {
      id: 14,
      name: "Robert K.",
      rating: 4.8,
      reviews: 134,
      price: 22,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "10 yrs",
      img: "RK",
      available: true,
    },
  ],
  carers: [
    {
      id: 15,
      name: "Emma S.",
      rating: 4.9,
      reviews: 178,
      price: 20,
      per: "hr",
      badge: ["Top Rated", "Verified"],
      exp: "9 yrs",
      img: "ES",
      available: true,
    },
  ],
  garden: [
    {
      id: 16,
      name: "George T.",
      rating: 4.8,
      reviews: 112,
      price: 24,
      per: "hr",
      badge: ["Verified"],
      exp: "6 yrs",
      img: "GT",
      available: true,
    },
  ],
  musicians: [
    {
      id: 17,
      name: "Jazz Band",
      rating: 5.0,
      reviews: 45,
      price: 150,
      per: "event",
      badge: ["Top Rated", "Verified"],
      exp: "8 yrs",
      img: "JB",
      available: true,
    },
  ],
};

const getProviders = (cat) => PROVIDERS[cat] || PROVIDERS.cleaners;

// -- Colors ------------------------------------------------------------------
const C = {
  bg: "#F7F5F0",
  card: "#FFFFFF",
  primary: "#1A1A2E",
  accent: "#E85D4A",
  gold: "#D4A853",
  mint: "#3ABFB0",
  text: "#1A1A2E",
  muted: "#8A8A9A",
  border: "#E8E6E0",
  success: "#2DB87A",
};

// -- Tiny Components ----------------------------------------------------------
const Badge = ({ label }) => {
  const colors = {
    "Top Rated": [C.gold, "#FFF8EC"],
    Verified: [C.mint, "#EBF9F8"],
    Recommended: [C.accent, "#FEF0EE"],
  };
  const [fg, bg] = colors[label] || [C.muted, "#F0F0F0"];

  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
};

const Stars = ({ rating }) => (
  <span style={{ color: C.gold, fontSize: 12 }}>
    {"★".repeat(Math.floor(rating))}
    {"☆".repeat(5 - Math.floor(rating))}
    <span style={{ color: C.muted, marginLeft: 4, fontSize: 11 }}>
      {rating}
    </span>
  </span>
);

const Avatar = ({ initials, size = 44, color = C.accent }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      fontSize: size * 0.3,
      fontFamily: "'Clash Display', sans-serif",
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

const Btn = ({
  children,
  onClick,
  variant = "primary",
  small = false,
  disabled = false,
  style = {},
}) => {
  const styles = {
    primary: { background: C.primary, color: "#fff" },
    accent: { background: C.accent, color: "#fff" },
    outline: {
      background: "transparent",
      color: C.primary,
      border: `1.5px solid ${C.primary}`,
    },
    ghost: { background: C.bg, color: C.text, border: `1px solid ${C.border}` },
    mint: { background: C.mint, color: "#fff" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        borderRadius: 10,
        border: "none",
        padding: small ? "8px 16px" : "12px 24px",
        fontSize: small ? 12 : 14,
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// -- Screen: Home -------------------------------------------------------------
const HomeScreen = ({ onNavigate }) => {
  const [search, setSearch] = useState("");
  const filtered = CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "0 0 80px" }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #2D2D4E 100%)`,
          padding: "32px 20px 40px",
          borderRadius: "0 0 32px 32px",
        }}
      >
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 26,
            color: "#fff",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          Find trusted local
          <br />
          <span style={{ color: C.gold }}>professionals</span> near you
        </div>
        <div
          style={{
            color: "#ffffff88",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 20,
          }}
        >
          Book cleaners, chefs, drivers & more
        </div>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for services..."
            style={{
              width: "100%",
              background: "#ffffff15",
              border: "1px solid #ffffff30",
              borderRadius: 12,
              padding: "12px 16px 12px 42px",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div
          onClick={() => onNavigate("ai")}
          style={{
            marginTop: 16,
            background: `linear-gradient(135deg, ${C.accent}, #C04835)`,
            borderRadius: 16,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 28 }}>✨</div>
          <div>
            <div
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "'Clash Display', sans-serif",
              }}
            >
              Ask Max AI
            </div>
            <div
              style={{
                color: "#ffffff99",
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Describe what you need — Max handles the rest
            </div>
          </div>
          <div style={{ marginLeft: "auto", color: "#ffffff88", fontSize: 18 }}>
            →
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 16,
          }}
        >
          {search ? `Results for "${search}"` : "Browse Services"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {filtered.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate("category", cat)}
              style={{
                background: C.card,
                borderRadius: 16,
                padding: "16px",
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                transition: "all .15s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
              <div
                style={{
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  lineHeight: 1.3,
                }}
              >
                {cat.name}
              </div>
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontFamily: "'DM Sans', sans-serif",
                  marginTop: 4,
                }}
              >
                {cat.subs.length} services
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          margin: "24px 20px 0",
          background: `linear-gradient(135deg, ${C.mint}, #2A9B8E)`,
          borderRadius: 20,
          padding: "20px",
          cursor: "pointer",
        }}
        onClick={() => onNavigate("group")}
      >
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 16,
            color: "#fff",
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          🎊 Planning an event?
        </div>
        <div
          style={{
            color: "#ffffffcc",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 12,
          }}
        >
          Book multiple services in one group request — chefs, cleaners, waiters
          & more
        </div>
        <Btn
          variant="primary"
          small
          style={{
            background: "#ffffff22",
            color: "#fff",
            border: "1px solid #ffffff44",
          }}
        >
          Create Group Booking →
        </Btn>
      </div>
    </div>
  );
};

// -- Screen: Category ---------------------------------------------------------
const CategoryScreen = ({ category, onBook }) => {
  const [selectedSub, setSelectedSub] = useState(null);
  const [workType, setWorkType] = useState("short");
  const [pricing, setPricing] = useState("hourly");
  const providers = getProviders(category.id);

  return (
    <div style={{ padding: "0 0 80px" }}>
      <div style={{ background: C.primary, padding: "24px 20px 32px" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{category.icon}</div>
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 22,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {category.name}
        </div>
        <div
          style={{
            color: "#ffffff66",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 4,
          }}
        >
          {providers.length} providers available near you
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: C.text,
            marginBottom: 12,
          }}
        >
          Select Service Type
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {category.subs.map((sub) => (
            <div
              key={sub}
              onClick={() => setSelectedSub(sub === selectedSub ? null : sub)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                cursor: "pointer",
                transition: "all .15s",
                background: selectedSub === sub ? C.primary : C.card,
                color: selectedSub === sub ? "#fff" : C.text,
                border: `1.5px solid ${
                  selectedSub === sub ? C.primary : C.border
                }`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {sub}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: C.text,
            marginBottom: 12,
          }}
        >
          Work Type
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            ["short", "Short-Term", "Hourly / Daily"],
            ["long", "Long-Term", "Weekly / Monthly"],
          ].map(([val, label, desc]) => (
            <div
              key={val}
              onClick={() => setWorkType(val)}
              style={{
                padding: "14px",
                borderRadius: 12,
                cursor: "pointer",
                background: workType === val ? C.primary : C.card,
                border: `1.5px solid ${workType === val ? C.primary : C.border}`,
              }}
            >
              <div
                style={{
                  color: workType === val ? "#fff" : C.text,
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  color: workType === val ? "#ffffff88" : C.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {desc}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: C.text,
            marginBottom: 12,
          }}
        >
          Pricing Model
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(workType === "short"
            ? ["Hourly", "Shift", "Daily"]
            : ["Weekly", "Monthly"]
          ).map((p) => (
            <div
              key={p}
              onClick={() => setPricing(p.toLowerCase())}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                cursor: "pointer",
                background: pricing === p.toLowerCase() ? C.accent : C.card,
                color: pricing === p.toLowerCase() ? "#fff" : C.text,
                border: `1.5px solid ${
                  pricing === p.toLowerCase() ? C.accent : C.border
                }`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {p}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: C.text,
            marginBottom: 12,
          }}
        >
          Available Providers
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {providers.map((p) => (
            <div
              key={p.id}
              style={{
                background: C.card,
                borderRadius: 16,
                padding: "16px",
                border: `1px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                opacity: p.available ? 1 : 0.6,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ position: "relative" }}>
                  <Avatar initials={p.img} />
                  {p.available && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: C.success,
                        border: "2px solid #fff",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Clash Display', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.text,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Clash Display', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: C.accent,
                      }}
                    >
                      £{p.price}
                      <span
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 400,
                        }}
                      >
                        /{p.per}
                      </span>
                    </div>
                  </div>
                  <Stars rating={p.rating} />
                  <div
                    style={{
                      color: C.muted,
                      fontSize: 11,
                      fontFamily: "'DM Sans', sans-serif",
                      marginTop: 2,
                    }}
                  >
                    {p.reviews} reviews · {p.exp} experience
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    {p.badge.map((b) => (
                      <Badge key={b} label={b} />
                    ))}
                    {!p.available && <Badge label="Unavailable" />}
                  </div>
                </div>
              </div>
              {p.available && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Btn variant="outline" small style={{ flex: 1 }}>
                    View Profile
                  </Btn>
                  <Btn
                    variant="accent"
                    small
                    style={{ flex: 1 }}
                    onClick={() => onBook({ provider: p, category, workType, pricing })}
                  >
                    Book Now
                  </Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// -- Screen: Booking Confirm --------------------------------------------------
const BookingScreen = ({ booking, onDone }) => {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState(3);
  const [payMethod, setPayMethod] = useState("card");
  const bookingId = useRef(`CM${Math.floor(Math.random() * 100000)}`);
  const { provider, category } = booking;

  const serviceTotal = provider.price * hours;
  const total = serviceTotal + 2;

  if (step === 2) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          Booking Confirmed!
        </div>
        <div
          style={{
            color: C.muted,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 24,
          }}
        >
          Your booking has been placed successfully
        </div>
        <div
          style={{
            background: C.card,
            borderRadius: 20,
            padding: "20px",
            border: `1px solid ${C.border}`,
            textAlign: "left",
            marginBottom: 24,
          }}
        >
          {[
            ["Booking ID", bookingId.current],
            ["Provider", provider.name],
            ["Service", category.name],
            ["Date", date || "To be confirmed"],
            ["Duration", `${hours} hours`],
            ["Total Paid", `£${total}`],
            ["Status", "Confirmed ✓"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span
                style={{
                  color: C.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  color: k === "Total Paid" ? C.accent : C.text,
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
        <Btn variant="primary" onClick={onDone} style={{ width: "100%" }}>
          Back to Home
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 80px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["Details", "Payment"].map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= step ? C.primary : C.border,
              transition: "all .3s",
            }}
          />
        ))}
      </div>

      {step === 0 && (
        <>
          <div
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
              marginBottom: 20,
            }}
          >
            Booking Details
          </div>
          <div
            style={{
              background: C.card,
              borderRadius: 16,
              padding: 16,
              border: `1px solid ${C.border}`,
              marginBottom: 20,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <Avatar initials={provider.img} />
            <div>
              <div
                style={{
                  fontFamily: "'Clash Display', sans-serif",
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                {provider.name}
              </div>
              <div
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {category.name}
              </div>
              <Stars rating={provider.rating} />
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.accent,
                }}
              >
                £{provider.price}
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>per hour</div>
            </div>
          </div>

          {[
            ["📅 Date", "date", "date", date, setDate],
            ["🕐 Time", "time", "time", time, setTime],
          ].map(([label, name, type, val, setter]) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.text,
                  marginBottom: 6,
                }}
              >
                {label}
              </label>
              <input
                type={type}
                value={val}
                onChange={(e) => setter(e.target.value)}
                style={{
                  width: "100%",
                  background: C.card,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: C.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: C.text,
                marginBottom: 6,
              }}
            >
              📍 Location
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your address..."
              style={{
                width: "100%",
                background: C.card,
                border: `1.5px solid ${C.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: C.text,
                marginBottom: 6,
              }}
            >
              ⏱ Duration: <strong>{hours} hours</strong>
            </label>
            <input
              type="range"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div
            style={{
              background: "#FFF8F7",
              borderRadius: 16,
              padding: 16,
              border: "1px solid #FFE0DC",
              marginBottom: 20,
            }}
          >
            {[
              ["Service", `£${provider.price} × ${hours}h`],
              ["Platform Fee", "£2.00"],
              ["Total", `£${total}`],
            ].map(([k, v], i) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: i < 2 ? "1px solid #FFE0DC" : "none",
                }}
              >
                <span
                  style={{
                    color: i === 2 ? C.text : C.muted,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: i === 2 ? 600 : 400,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    color: i === 2 ? C.accent : C.text,
                    fontFamily: "'Clash Display', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          <Btn variant="primary" onClick={() => setStep(1)} style={{ width: "100%" }}>
            Proceed to Payment →
          </Btn>
        </>
      )}

      {step === 1 && (
        <>
          <div
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
              marginBottom: 20,
            }}
          >
            Payment
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              ["card", "💳 Credit / Debit Card"],
              ["apple", "🍎 Apple Pay"],
              ["bank", "🏦 Internet Banking"],
            ].map(([val, label]) => (
              <div
                key={val}
                onClick={() => setPayMethod(val)}
                style={{
                  padding: "16px",
                  borderRadius: 14,
                  cursor: "pointer",
                  background: payMethod === val ? C.primary : C.card,
                  border: `1.5px solid ${payMethod === val ? C.primary : C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>{label.split(" ")[0]}</span>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: payMethod === val ? "#fff" : C.text,
                  }}
                >
                  {label.slice(2)}
                </span>
                {payMethod === val && (
                  <span style={{ marginLeft: "auto", color: C.mint }}>✓</span>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#F0FBF9",
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              border: "1px solid #C5EDE9",
            }}
          >
            <div
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: C.mint,
                marginBottom: 4,
              }}
            >
              🔒 Secure Escrow Payment
            </div>
            <div
              style={{
                color: C.muted,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
              }}
            >
              Your payment is held securely and released to the provider only
              after service completion and OTP verification.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="outline" onClick={() => setStep(0)} style={{ flex: 1 }}>
              ← Back
            </Btn>
            <Btn variant="accent" onClick={() => setStep(2)} style={{ flex: 2 }}>
              Pay £{total} →
            </Btn>
          </div>
        </>
      )}
    </div>
  );
};

// -- Screen: AI Concierge -----------------------------------------------------
const AIScreen = ({ onNavigate }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm Max 👋 I can help you book any service instantly. What do you need today?",
      services: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    setTimeout(() => {
      const responses = [
        {
          message: "I found 3 cleaners available for you! Check them out below.",
          services: [
            {
              icon: "🧹",
              name: "Cleaners & House Help",
              quantity: 1,
              reason: "For deep cleaning your home",
            },
          ],
        },
        {
          message: "Perfect! I can arrange a private chef and event staff for you.",
          services: [
            {
              icon: "👨‍🍳",
              name: "Private Chef & Catering",
              quantity: 1,
              reason: "For catering your event",
            },
            {
              icon: "🎉",
              name: "Event Staff",
              quantity: 2,
              reason: "To help with service",
            },
          ],
        },
        {
          message: "I'll help you with drivers and movers for your relocation.",
          services: [
            {
              icon: "🚗",
              name: "Drivers & Van Hire",
              quantity: 1,
              reason: "For transportation",
            },
            {
              icon: "📦",
              name: "Packers & Movers",
              quantity: 2,
              reason: "For moving services",
            },
          ],
        },
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: response.message,
          services: response.services,
        },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <div
        style={{
          background: C.primary,
          padding: "20px 20px 24px",
          borderRadius: "0 0 24px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            ✨
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Max AI Concierge
            </div>
            <div
              style={{
                color: "#ffffff66",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
              }}
            >
              Always online · Instant booking
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: C.success,
              boxShadow: `0 0 8px ${C.success}`,
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 16,
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap: 10,
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ✨
              </div>
            )}
            <div style={{ maxWidth: "75%" }}>
              <div
                style={{
                  background: msg.role === "user" ? C.primary : C.card,
                  color: msg.role === "user" ? "#fff" : C.text,
                  borderRadius:
                    msg.role === "user"
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                  padding: "12px 16px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: msg.role === "assistant" ? `1px solid ${C.border}` : "none",
                }}
              >
                {msg.text}
              </div>
              {msg.services && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {msg.services.map((s, j) => (
                    <div
                      key={j}
                      style={{
                        background: C.card,
                        borderRadius: 14,
                        padding: "12px 14px",
                        border: `1px solid ${C.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: "'Clash Display', sans-serif",
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text,
                          }}
                        >
                          {s.quantity}x {s.name}
                        </div>
                        <div
                          style={{
                            color: C.muted,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                          }}
                        >
                          {s.reason}
                        </div>
                      </div>
                      <Btn
                        variant="accent"
                        small
                        onClick={() =>
                          onNavigate(
                            "category",
                            CATEGORIES.find((c) => c.name === s.name) || CATEGORIES[0]
                          )
                        }
                      >
                        Book
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ✨
            </div>
            <div
              style={{
                background: C.card,
                borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
              }}
            >
              <span
                style={{
                  color: C.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                }}
              >
                Max is thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 20px 0", display: "flex", gap: 8, overflowX: "auto" }}>
        {[
          "I need a cleaner",
          "House party for 50",
          "Private chef needed",
          "Office move help",
        ].map((p) => (
          <div
            key={p}
            onClick={() => {
              setInput(p);
            }}
            style={{
              whiteSpace: "nowrap",
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${C.border}`,
              background: C.card,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: C.text,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {p}
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 20px 20px", display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Describe what you need..."
          style={{
            flex: 1,
            background: C.card,
            border: `1.5px solid ${C.border}`,
            borderRadius: 24,
            padding: "12px 18px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            outline: "none",
            color: C.text,
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: C.accent,
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: !input.trim() ? 0.5 : 1,
            transition: "all .15s",
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};

// -- Screen: Group Booking ----------------------------------------------------
const GroupScreen = ({ onNavigate }) => {
  const [selected, setSelected] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const selectedTotal = selected.reduce(
    (total, id) => total + (quantities[id] || 1),
    0
  );

  const toggle = (cat) => {
    setSelected((s) =>
      s.includes(cat.id) ? s.filter((x) => x !== cat.id) : [...s, cat.id]
    );
    if (!quantities[cat.id]) {
      setQuantities((q) => ({ ...q, [cat.id]: 1 }));
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
        <div
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          Request Submitted!
        </div>
        <div
          style={{
            color: C.muted,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 24,
            lineHeight: 1.7,
          }}
        >
          Your group booking request has been sent to relevant companies. You'll
          receive quotations within 2 hours for review.
        </div>
        <div
          style={{
            background: C.card,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${C.border}`,
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: C.text,
              marginBottom: 12,
            }}
          >
            Services Requested:
          </div>
          {selected.map((id) => {
            const cat = CATEGORIES.find((c) => c.id === id);

            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: C.text,
                  }}
                >
                  {quantities[id]}x {cat.name}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            background: "#FFF8EC",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            border: "1px solid #FFE4A0",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: C.gold,
            }}
          >
            ⏳ What happens next?
          </div>
          <div
            style={{
              color: C.muted,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            Companies will submit quotations → Admin reviews → You receive
            approved offers to compare and select
          </div>
        </div>
        <Btn variant="primary" onClick={() => onNavigate("home")} style={{ width: "100%" }}>
          Back to Home
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 80px" }}>
      <div
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: C.text,
          marginBottom: 6,
        }}
      >
        Group Booking
      </div>
      <div
        style={{
          color: C.muted,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        Select multiple services you need. We'll send your request to companies
        who can fulfill all or part of your needs.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => toggle(cat)}
            style={{
              background: C.card,
              borderRadius: 14,
              padding: "14px 16px",
              border: `2px solid ${
                selected.includes(cat.id) ? C.primary : C.border
              }`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              transition: "all .15s",
            }}
          >
            <span style={{ fontSize: 24 }}>{cat.icon}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                {cat.name}
              </div>
              <div
                style={{
                  color: C.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                }}
              >
                {cat.subs.join(", ")}
              </div>
            </div>
            {selected.includes(cat.id) ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    setQuantities((q) => ({
                      ...q,
                      [cat.id]: Math.max(1, (q[cat.id] || 1) - 1),
                    }))
                  }
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontFamily: "'Clash Display', sans-serif",
                    fontWeight: 700,
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {quantities[cat.id] || 1}
                </span>
                <button
                  onClick={() =>
                    setQuantities((q) => ({
                      ...q,
                      [cat.id]: (q[cat.id] || 1) + 1,
                    }))
                  }
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background: C.primary,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: `2px solid ${C.border}`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 80,
            background: C.card,
            borderRadius: 20,
            padding: "16px",
            border: `1px solid ${C.border}`,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: C.muted,
              marginBottom: 10,
            }}
          >
            {selected.length} service type{selected.length > 1 ? "s" : ""} selected ·{" "}
            {selectedTotal} professionals total
          </div>
          <Btn variant="accent" onClick={() => setSubmitted(true)} style={{ width: "100%" }}>
            Submit Group Request →
          </Btn>
        </div>
      )}
    </div>
  );
};

// -- Screen: My Bookings ------------------------------------------------------
const BookingsScreen = () => {
  const bookings = [
    {
      id: "CM48291",
      service: "Cleaners & House Help",
      provider: "Sarah M.",
      date: "Today, 2:00 PM",
      status: "In Progress",
      amount: 54,
      statusColor: C.mint,
    },
    {
      id: "CM47182",
      service: "Private Chef",
      provider: "Marco B.",
      date: "Yesterday",
      status: "Completed",
      amount: 180,
      statusColor: C.success,
    },
    {
      id: "CM46001",
      service: "Drivers & Van Hire",
      provider: "Tom H.",
      date: "Last week",
      status: "Cancelled",
      amount: 0,
      statusColor: C.muted,
    },
  ];

  return (
    <div style={{ padding: "20px 20px 80px" }}>
      <div
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: C.text,
          marginBottom: 20,
        }}
      >
        My Bookings
      </div>
      {bookings.map((b) => (
        <div
          key={b.id}
          style={{
            background: C.card,
            borderRadius: 16,
            padding: "16px",
            border: `1px solid ${C.border}`,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: C.text,
              }}
            >
              {b.service}
            </div>
            <span
              style={{
                background: `${b.statusColor}15`,
                color: b.statusColor,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 20,
              }}
            >
              {b.status}
            </span>
          </div>
          <div
            style={{
              color: C.muted,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            {b.provider} · {b.date} · #{b.id}
          </div>
          {b.amount > 0 && (
            <div
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 15,
                color: C.accent,
                fontWeight: 700,
              }}
            >
              £{b.amount}
            </div>
          )}
          {b.status === "In Progress" && (
            <div
              style={{
                marginTop: 12,
                background: "#F0FBF9",
                borderRadius: 10,
                padding: "10px 12px",
                border: "1px solid #C5EDE9",
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: C.mint,
                  fontWeight: 500,
                }}
              >
                🔑 Your completion OTP: <strong>4729</strong>
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                Share this with your provider when service is complete
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ProfileScreen = () => (
  <div style={{ padding: "40px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <Avatar initials="AZ" size={72} color={C.primary} />
      <div
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: C.text,
          marginTop: 12,
        }}
      >
        Ali Zakaria
      </div>
      <div style={{ color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
        ali@calloutmax.com
      </div>
    </div>
    {[
      ["📋 My Bookings", "12 total"],
      ["💳 Payment Methods", "2 saved"],
      ["📍 Saved Addresses", "Home, Office"],
      ["⚙️ Settings", "Notifications, Privacy"],
      ["❓ Help & Support", "24/7 available"],
    ].map(([k, v]) => (
      <div
        key={k}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          background: C.card,
          borderRadius: 12,
          marginBottom: 10,
          border: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: C.text,
          }}
        >
          {k}
        </span>
        <span
          style={{
            color: C.muted,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
          }}
        >
          {v} →
        </span>
      </div>
    ))}
  </div>
);

// -- Main App ----------------------------------------------------------------
export default function App() {
  const [screen, setScreen] = useState("home");
  const [screenData, setScreenData] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  const navigate = (to, data = null) => {
    setScreen(to);
    setScreenData(data);
    if (["home", "ai", "bookings", "profile"].includes(to)) {
      setActiveTab(to);
    }
  };

  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "ai", icon: "✨", label: "Max AI" },
    { id: "bookings", icon: "📋", label: "Bookings" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];

  const isDarkHeader = ["home", "category", "ai"].includes(screen);

  const renderScreen = () => {
    if (screen === "category") {
      return (
        <CategoryScreen
          category={screenData}
          onBook={(b) => navigate("booking", b)}
        />
      );
    }
    if (screen === "booking") {
      return <BookingScreen booking={screenData} onDone={() => navigate("home")} />;
    }
    if (screen === "group") {
      return <GroupScreen onNavigate={navigate} />;
    }
    if (screen === "ai") {
      return <AIScreen onNavigate={navigate} />;
    }
    if (screen === "bookings") {
      return <BookingsScreen />;
    }
    if (screen === "profile") {
      return <ProfileScreen />;
    }
    return <HomeScreen onNavigate={navigate} />;
  };

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        background: C.bg,
        minHeight: "100vh",
        position: "relative",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <link href={FONTS} rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        button { transition: opacity .15s, transform .1s; }
        button:active { transform: scale(0.97); }
      `}</style>

      <div
        style={{
          background: isDarkHeader ? C.primary : C.bg,
          padding: "10px 20px 0",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, color: isDarkHeader ? "#ffffff66" : C.muted }}>
          9:41
        </span>
        <span style={{ fontSize: 12, color: isDarkHeader ? "#ffffff66" : C.muted }}>
          ●●●
        </span>
      </div>

      {!["home", "ai", "bookings", "profile", "group"].includes(screen) && (
        <div
          style={{
            padding: "12px 20px 0",
            background: screen === "category" ? C.primary : C.bg,
          }}
        >
          <button
            onClick={() => navigate("home")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: screen === "category" ? "#fff" : C.text,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
            }}
          >
            ← Back
          </button>
        </div>
      )}
      {screen === "group" && (
        <div style={{ padding: "12px 20px 0" }}>
          <button
            onClick={() => navigate("home")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.text,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
            }}
          >
            ← Back
          </button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          height: screen === "ai" ? "calc(100vh - 130px)" : "auto",
          display: screen === "ai" ? "flex" : "block",
          flexDirection: "column",
        }}
      >
        {renderScreen()}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 420,
          background: C.card,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          padding: "8px 0 12px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => navigate(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 20,
                filter: activeTab === tab.id ? "none" : "grayscale(100%)",
                opacity: activeTab === tab.id ? 1 : 0.5,
              }}
            >
              {tab.icon}
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: activeTab === tab.id ? C.accent : C.muted,
              }}
            >
              {tab.label}
            </div>
            {activeTab === tab.id && (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: C.accent,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
