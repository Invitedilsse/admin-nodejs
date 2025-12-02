import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import { adminDb } from '../config/adminDb.js';

export const hashPassword= (password)=>{
    return new Promise( (resolve, reject) => {
        bcrypt.genSalt(12,(err, salt)=>{
            if(err){
                reject(err);
            }
            bcrypt.hash(password,salt, (err, hash)=>{
                if(err){
                     reject(err);
                }
                resolve(hash);
            })
        })
    })
}

export const comparePassword = (password,hashed) => {
    return bcrypt.compare(password,hashed);
}


export const generateToken = (user) => {
  const secret = process.env.JWT_WEB_TOKEN_SECRET;
  const payload = {
    id: user.id,
    name: user.first_name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
  };

  const options = { expiresIn: "30d" };

  return jwt.sign(payload, secret, options);
};


export const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_WEB_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    req.user = user;
    next();
  });
};

export const mainAndSuperOnly =async (req, res, next) => {
  const token = req.header('Authorization');
  const loggedUser = req.user
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

        const { rows: findRoleType } = await adminDb.query(
                `SELECT role, is_restricted FROM users WHERE id = $1`,
                [loggedUser.id]
              );
          
              if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
              if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
              if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");
    next();
};

export const supportOnly =async (req, res, next) => {
  const token = req.header('Authorization');
  const loggedUser = req.user
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

        const { rows: findRoleType } = await adminDb.query(
                `SELECT role, is_restricted FROM users WHERE id = $1`,
                [loggedUser.id]
              );
          
              if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
              if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
              if (loggedUser.role === 'main' && loggedUser.role === 'super-admin') throw Boom.conflict("User is restricted.");
    next();
};

export const AdminOnly =async (req, res, next) => {
  const token = req.header('Authorization');
  const loggedUser = req.user
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

        const { rows: findRoleType } = await adminDb.query(
                `SELECT role, is_restricted FROM users WHERE id = $1`,
                [loggedUser.id]
              );
          
              if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
              if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
              if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");
    next();
};
