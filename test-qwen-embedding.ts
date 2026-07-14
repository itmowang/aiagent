import {
    createQwenEmbedding
} from "./src/rag/embedding/embedding";


async function main() {


    const embedding =
        createQwenEmbedding({
            apiKey: "sk-a533d2c940f948feb39615fb2545ded7",
            baseURL:
                "https://dashscope.aliyuncs.com/compatible-mode/v1",
            model: "text-embedding-v4"

        });



    const vector =
        await embedding.embed(
            "空运是什么"
        );


    console.log(
        "向量长度:",
        vector.length
    );


    console.log(
        vector.slice(0, 10)
    );

}


main()
    .catch(console.error);