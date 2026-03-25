export const usersData = [
  {
    email: "admin@etbaly.com",
    password: "Admin123!",
    role: "admin" as const,
    isVerified: true,
    profile: { firstName: "Admin", lastName: "User" },
  },
  {
    email: "operator@etbaly.com",
    password: "Operator123!",
    role: "operator" as const,
    isVerified: true,
    profile: { firstName: "Operator", lastName: "User" },
  },
  {
    email: "client@etbaly.com",
    password: "Client123!",
    role: "client" as const,
    isVerified: true,
    profile: {
      firstName: "John",
      lastName: "Doe",
      bio: "3D printing enthusiast",
    },
    savedAddresses: [
      { street: "123 Main St", city: "Cairo", country: "Egypt", zip: "11511" },
    ],
  },
];
