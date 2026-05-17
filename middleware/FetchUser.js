var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const fetchUser = (req, res, next) => {
  // Get the token from either `auth-token` header or standard `Authorization: Bearer <token>`
  let token = req.header("auth-token");
  if (!token) {
    const authHeader =
      req.header("authorization") || req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res
      .status(401)
      .send({ error: "Please authenticate using a valid token" });
  }

  try {
    const data = jwt.verify(token, JWT_SECRET);
    // Ensure `req.user.id` is defined (payload expected to contain `id`)
    req.user = { id: data.id || (data.user && data.user.id) };
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate using a valid token" });
  }
};

module.exports = fetchUser;
