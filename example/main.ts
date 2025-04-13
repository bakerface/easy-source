import { Users } from "./users";

const user = await Users.fetch({ id: "0" });

user.register({
  email: "john@doe.com",
});

await user.save();
