import { v4 as uuidv4 } from 'uuid';
import {  Server, StableBTreeMap, ic } from 'azle';
import express, { Request, Response,NextFunction } from 'express';
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"


interface User {
    user_id: string;
    password: string;
    email: string;
    role: "Customer" | "Chef" | "Admin";
    createdAt: Date,
    updatedAt: Date | undefined
};


interface Restaurant {
    restaurant_id: string;
    name: string,
    address: string;
    phone_number: string;
    email: string;
    description: string;
    createdAt: Date;
    updatedAt: Date
}

interface Menu {

    menu_id: string;
    restaurant_id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date

}

interface Dish {
    dish_id: string;
    menu_id: string;
    name: string;
    description: string;
    price: number;
    createdAt: Date;
    updatedAt: Date
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
const MessageStorage = StableBTreeMap<string, Message>(4)

const userTaken =(email:string)=>{
    const users = UserStorage.values();
    if(users.length == 0){
        return 0
    }else {
        return users.map((user:User)=> user.email).includes(email)
    }

}

const userExist=(email: string)=>{
    const users = UserStorage.values();
    return users.map((user:User)=> user.email).includes(email)
}
const hashPassword = async(password: string)=>{
 const SALT_ROUNDS= 10;
 const hashedPassword = await bcrypt.hash(password,SALT_ROUNDS);
 return hashedPassword
}
const comparePassword=async(password: string,hashedPassword: string)=>{
    const isMatch = await bcrypt.compare(password,hashedPassword);
    return isMatch
}

const JWT_SECRET = "BESTicp"
const generateToken=(email:string)=>{
return jwt.sign(email,JWT_SECRET,{expiresIn: "21h"})
}
const verifyToken=(token: string)=>{
 try{
  return jwt.verify(token,JWT_SECRET)
 }catch(err){
    return null
 }
}

const auth =(req:Request,res:Response,next: NextFunction)=>{
   try{
     const token = req.header("Authorization")?.split(" ")[1];
     if(!token){
        return res.status(401).json({status: 401,error:"Please login"})
     }
     const dataValid = verifyToken(token)
     if(!dataValid){
        return res.status(401).json({status: 401, error:"Login in again"})
     }
     if(!userExist(dataValid.data.email)){
        return res.status(404).json({status: 404, error: "user does not exit"})
     }
     const users = UserStorage.values();      
     const user = users.filter((item:User)=> item.email == dataValid.data.email)
     req.user = user;
     next();
   }catch(error:any){
    return res.status(500).json({status: 500, error: error.message})
   }
}
const isAdmin=(req: Request, res: Response, next:NextFunction)=>{
    try{
        const { role } = req.user;
        if(role !== "Admin"){
            return res.status(404).json({status: 404, error: "You are unauthorized"})
        }
        next()
    }catch(error){
        return res.status(500).json({status: 500, error: error.message})
    }
}
export default Server(()=>{
    const app = express();
    app.use(express.json());
   
     app.use('/register',async(req:Request,res: Response)=>{
       try{
        const  { 
            password,
            email
        } = req.body;
        if(userTaken(email)){
            return res.status(404).json({status: 404, error: "User already exist"})
        }else if(userTaken(email) === 0){
            const hashedPassword = await hashPassword(password)
          
            const adminUser : User ={
                user_id: uuidv4(),
                password: hashedPassword,
                email,
                role: 'Admin',
                createdAt: getCurrentDate(),
                updatedAt: getCurrentDate()
            }
            UserStorage.insert(adminUser.user_id,adminUser);
            return res.status(201).json({status: 201, message:"You are register as admin"})
        }else {
            const hashedPassword = await hashPassword(password)
            const newUser : User ={
                user_id: uuidv4(),
                password: hashedPassword,
                email,
                role: 'Customer',
                createdAt: getCurrentDate(),
                updatedAt: getCurrentDate()
            }
            UserStorage.insert(newUser.user_id,newUser);
            return res.status(201).json({status: 201, message:"You are register successfully"})   
        }
       }catch(error: any){
        return res.status(500).json({status: 500, error: error.message})
       }
     });

     app.post('/login',(req: Request, res: Response)=>{
       try{
        const { email, password } = req.body;
        
        if(!userExist(email)){
            return res.status(401).json({status: 401, error:"User does not exist"})
        }
        const users = UserStorage.values();      
        const user = users.filter((item:User)=> item.email == email)

        if(!comparePassword(password,user.password)){
            return res.status(401).json({status: 401, error : "Wrong password"})
        }
        const token = generateToken(user.email)
        return res.status(200).json({status: 200, token})

       }catch(error){
        return res.status(500).json({status: 500, error: error.message})
       }
     });
     // Restaurant endpoints
    
     // #1. Add restaurant
     app.post("/Restaurant",auth, isAdmin,(req: Request, res:Response)=>{
      try{
        const {
       
            name,
            address,
            phone_number,
            email,
            description
          
        } = req.body;
        const newResto: Restaurant={
            restaurant_id: uuidv4(),
            name,
            address,
            phone_number,
            email,
            description,
            createdAt: getCurrentDate(),
            updatedAt: getCurrentDate()
        }
        RestaurantStorage.insert(newResto.restaurant_id,newResto);
        return res.status(201).json({status: 201, message: "Restaurant created successfully"})   
      }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
      }


    });

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
   
   
   const getCurrentDate=()=>{
       const timestamp = new Number(ic.time());
       return new Date(timestamp.valueOf() / 1000_000);
   }
   