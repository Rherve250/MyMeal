import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator'; // For input validation

interface User {
    user_id: string;
    password: string;
    email: string;
    role: 'Customer' | 'Chef' | 'Admin';
    createdAt: Date;
    updatedAt: Date | undefined;
}

interface Restaurant {
    restaurant_id: string;
    name: string;
    address: string;
    phone_number: string;
    email: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Menu {
    menu_id: string;
    restaurant_id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Dish {
    dish_id: string;
    menu_id: string;
    name: string;
    description: string;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}

interface Message {
    message_id: string;
    user_id: string;
    chef_id: string;
    content: string;
}

const UserStorage = StableBTreeMap<string, User>(0);
const RestaurantStorage = StableBTreeMap<string, Restaurant>(1);
const MenuStorage = StableBTreeMap<string, Menu>(2);
const DishStorage = StableBTreeMap<string, Dish>(3);
const MessageStorage = StableBTreeMap<string, Message>(4);

const JWT_SECRET = 'BESTicp';

// Utility function to return current date in a format needed
const getCurrentDate = (): Date => {
    const timestamp = new Number(ic.time());
    return new Date(timestamp.valueOf() / 1000_000);
};

// Check if a user email is taken
const userTaken = (email: string): boolean => {
    const users = UserStorage.values();
    return users.some((user: User) => user.email === email);
};

// Check if a user exists
const userExist = (email: string): boolean => {
    const users = UserStorage.values();
    return users.some((user: User) => user.email === email);
};

// Hashing user password
const hashPassword = async (password: string): Promise<string> => {
    const SALT_ROUNDS = 10;
    return await bcrypt.hash(password, SALT_ROUNDS);
};

// Compare password with hashed password
const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (email: string): string => {
    return jwt.sign({ email }, JWT_SECRET, { expiresIn: '21h' });
};

// Verify JWT token
const verifyToken = (token: string): string | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as string;
    } catch (err) {
        return null;
    }
};

// Middleware to check for authentication
const auth = (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ status: 401, error: 'Please login' });
        }
        const dataValid = verifyToken(token);
        if (!dataValid) {
            return res.status(401).json({ status: 401, error: 'Login in again' });
        }
        const email = (dataValid as any).email;
        if (!userExist(email)) {
            return res.status(404).json({ status: 404, error: 'User does not exist' });
        }
        const users = UserStorage.values();
        req.user = users.find((item: User) => item.email === email);
        next();
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
};

// Middleware to check for admin role
const isAdmin = (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
        const { role } = req.user;
        if (role !== 'Admin') {
            return res.status(403).json({ status: 403, error: 'You are unauthorized' });
        }
        next();
    } catch (error: any) {
        return res.status(500).json({ status: 500, error: error.message });
    }
};

// Initialize express server
export default Server(() => {
    const app = express();
    app.use(express.json());

    // Registration route with validation
    app.post(
        '/register',
        body('email').isEmail().withMessage('Invalid email'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;
            if (userTaken(email)) {
                return res.status(409).json({ status: 409, error: 'User already exists' });
            }

            try {
                const hashedPassword = await hashPassword(password);
                const newUser: User = {
                    user_id: uuidv4(),
                    password: hashedPassword,
                    email,
                    role: 'Customer',
                    createdAt: getCurrentDate(),
                    updatedAt: getCurrentDate(),
                };
                UserStorage.insert(newUser.user_id, newUser);
                return res.status(201).json({ status: 201, message: 'You are registered successfully' });
            } catch (error: any) {
                return res.status(500).json({ status: 500, error: error.message });
            }
        }
    );

    // Login route
    app.post('/login', async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!userExist(email)) {
            return res.status(401).json({ status: 401, error: 'User does not exist' });
        }

        try {
            const users = UserStorage.values();
            const user = users.find((u: User) => u.email === email);
            const passwordMatch = await comparePassword(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({ status: 401, error: 'Wrong password' });
            }

            const token = generateToken(user.email);
            return res.status(200).json({ status: 200, token });
        } catch (error: any) {
            return res.status(500).json({ status: 500, error: error.message });
        }
    });

    // Add restaurant
    app.post(
        '/Restaurant',
        auth,
        isAdmin,
        body('name').notEmpty().withMessage('Name is required'),
        body('address').notEmpty().withMessage('Address is required'),
        body('email').isEmail().withMessage('Invalid email'),
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, address, phone_number, email, description } = req.body;
            try {
                const newRestaurant: Restaurant = {
                    restaurant_id: uuidv4(),
                    name,
                    address,
                    phone_number,
                    email,
                    description,
                    createdAt: getCurrentDate(),
                    updatedAt: getCurrentDate(),
                };
                RestaurantStorage.insert(newRestaurant.restaurant_id, newRestaurant);
                return res.status(201).json({ status: 201, message: 'Restaurant created successfully' });
            } catch (error: any) {
                return res.status(500).json({ status: 500, error: error.message });
            }
        }
    );

   // #2. Get all restaurant

   app.get('/Restaurant',(req: Request, res: Response)=>{
    try{
        const restaurants = RestaurantStorage.values()
        return res.status(200).json({status: 200, restaurants})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
   });

   // # 3 get one restaurant

   app.get("/Restaurant/:id", (req: Request, res: Response)=>{
      try{
    
        const RestoOpt = RestaurantStorage.get(req.params.id)
        if("None" in RestoOpt){
            return res.status(404).json({status: 404, error: "Restaurant not found"})
        }

        return res.status(200).json({status: 200, Restaurant: RestoOpt.Some})

      }catch(error){
        return res.status(500).json({status: 500, error:error.message})
      }
   })
 
  // Menu endpoints
  
  // #1 Add menu

  app.post("/Menu/:restoId",(req:Request,res:Response)=>{
     
    try{
       const { restoId } = req.params;

       const { title,description}= req.body;

    const RestoExist = RestaurantStorage.get(restoId)
    if("None" in RestoExist){
    return res.status(404).json({status: 404, error: "Resto does not exist"})
    }
       const newMenu: Menu={
           menu_id: uuidv4(),
           restaurant_id: restoId,
           title,
           description,
           createdAt: getCurrentDate(),
           updatedAt: getCurrentDate()
       }
       MenuStorage.insert(newMenu.menu_id,newMenu)
       return res.status(201).json({status: 201, message: "Menu created successfully"})
    }catch(error){
        return res.status(500).json({status: 500, error:error.message})
    }

  });
  // #2 get All Menu
  app.get('/Menu',(req:Request,res: Response)=>{
    try{
       const Menus = MenuStorage.values();
       return res.status(200).json({status: 200, Menus})
    }catch(error){
        return res.status(500).json({status: 500, error: error.message})
    }
  });

  // # get one Menu

  app.get('/Menu/:menuId',(req:Request,res:Response)=>{
    try{
       const MenuOpt = MenuStorage.get(req.params.menuId)
       if("None" in MenuOpt){
        return res.status(404).json({status: 404,error:"Menu not found"})
       }
       const Menu = MenuOpt.Some;
       return res.status(200).json({status: 200, Menu})
    }catch(error){
        return res.status(500).json({status: 500, error: error.message})
    }
  })

 // Dish endpoint
 // # 1 add Dish
 
 app.post('/Dish/:menuId',(req:Request,res:Response)=>{
    try{
        const { name, description, price } = req.body;
        const MenuOpt = MenuStorage.get(req.params.menuId);
        if("None" in MenuOpt){
            return res.status(404).json({status: 404, error:"Menu not Found"});
        }

        const NewDish: Dish={
            dish_id: uuidv4(),
            menu_id: req.params.menuId,
            name,
            description,
            price,
            createdAt: getCurrentDate(),
            updatedAt: getCurrentDate()
        }
       DishStorage.insert(NewDish.dish_id,NewDish);
       return res.status(201).json({status: 201, message: "Dish created successfully"})
    }catch(error){
        return res.status(500).json({status: 500, error: error.message})
    }
  })   

  app.get("/Dish",(req:Request,res: Response)=>{
     try{
        const dishOpt = DishStorage.values();
        return res.status(200).json({status: 200, dishOpt})
     }catch(error){
        return res.status(500).json({status: 500, error: error.message})
     }
  });
  
  app.get("/Dish/id",(req:Request,res: Response)=>{
    try{
        const { id } = req.params;
        const DishOpt = DishStorage.get(id);
        if("None" in DishOpt){
            return res.status(404).json({status: 404, error: "Dish not found"})
        }
        const dish = DishOpt.Some
        return res.status(200).json({status: 200, dish})
    }catch(error){
       return res.status(500).json({status: 500, error: error.message})
    }
 });

 
   const PORT = 3500
   return app.listen(PORT,()=>{
       console.log(`Server is running on port ${PORT}`)
   })
   
   })
   
   