import { createOpenAIEmbedding } from "./src/rag/embedding/embedding";


async function main(){


    const embedding =
        createOpenAIEmbedding({

            apiKey:
            process.env.OPENAI_API_KEY!,

            baseURL:
            process.env.OPENAI_BASE_URL,

            model:
            "text-embedding-3-small"

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
        vector.slice(0,10)
    );


}


main()
.catch(console.error);