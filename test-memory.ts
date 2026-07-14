import {
    createMemory
} from "./src/memory";


const memory =
    createMemory();



memory.set(
    "name",
    "小明"
);


memory.set(
    "taste",
    "喜欢吃辣"
);



console.log(
    memory.get("name")
);


console.log(
    memory.all()
);