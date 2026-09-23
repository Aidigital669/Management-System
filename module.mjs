// @ts-check
import { module } from "@prisma/composer";
import managementSystemService from "./service.mjs";

export default module("management-system", ({ provision }) => {
  provision(managementSystemService, { id: "managementsystem" });
});
