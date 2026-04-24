import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tiers = [
  { name: "Studio / 1BR", price: 450 },
  { name: "2BR", price: 550 },
  { name: "3BR", price: 600 },
  { name: "4BR", price: 655 },
  { name: "5BR", price: 700 },
  { name: "6BR", price: 760 },
];

const service = await prisma.serviceItem.findFirst({
  where: {
    OR: [
      { title: { contains: "VIP", mode: "insensitive" } },
      { title: { contains: "Signature", mode: "insensitive" } },
      { name: { contains: "VIP", mode: "insensitive" } },
    ],
  },
});

if (!service) {
  console.log("VIP service not found. Available services:");
  const all = await prisma.serviceItem.findMany({ select: { id: true, title: true, name: true } });
  all.forEach((s) => console.log(` - [${s.id}] ${s.title ?? s.name}`));
} else {
  console.log(`Found: [${service.id}] ${service.title ?? service.name}`);
  await prisma.serviceItem.update({
    where: { id: service.id },
    data: { pricingTiers: tiers },
  });
  console.log("✅ Pricing tiers saved!");
}

await prisma.$disconnect();
