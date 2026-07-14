import {
    createQwenEmbedding
} from "./src/rag/embedding/embedding";

import {
    createQdrantVectorStore
} from "./src/rag/qdrant";

import {
    createRetriever
} from "./src/rag/retriever";


async function main() {


    const embedding =
        createQwenEmbedding({

            apiKey: "sk-a533d2c940f948feb39615fb2545ded7",
            baseURL:
                "https://dashscope.aliyuncs.com/compatible-mode/v1",

            model:
                "text-embedding-v4"

        });



    const vectorStore =
        createQdrantVectorStore({

            url:
                "http://localhost:6333",

            collection:
                "knowledge",

            vectorSize:
                1024

        });



    await vectorStore.init();



    /**
     * 写入知识
     */

    const documents = [

        "空运是一种通过飞机运输货物的物流方式，速度快，适合高价值和紧急货物。",

        "海运是一种通过船舶运输货物的方式，成本低，适合大量货物运输。",

        "铁路运输适合中长距离的大宗货物运输。"

    ];



    const vectors =
        await embedding.embedMany(
            documents
        );


    await vectorStore.add(
        documents.map((text, index) => ({
            id: index + 1,

            content: text,

            vector: vectors[index],

            metadata: {
                source: "物流知识库"
            }

        }))

    );



    console.log("知识写入完成");



    /**
     * Retriever
     */

    const retriever =
        createRetriever({

            embedding,

            vectorStore

        });



    const result =
        await retriever.search(

            "飞机运输货物是什么",

            3

        );



    console.log(
        "检索结果:"
    );


    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );


}


main()
    .catch(console.error);