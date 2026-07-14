import { createQdrantVectorStore } from "./src/rag/qdrant";


async function main() {

    const store = createQdrantVectorStore({

        url: "http://localhost:6333",

        collection: "knowledge",

        vectorSize: 4

    });


    // 初始化 Collection
    console.log("初始化Qdrant...");

    await store.init();



    // 写入数据

    console.log("写入数据...");

    await store.add([

        {
            id: 1,

            content: "空运是一种通过飞机运输货物的方式",

            vector: [
                0.1,
                0.2,
                0.3,
                0.4
            ],

            metadata: {
                source: "物流知识库"
            }

        },


        {
            id: 2,

            content: "海运适合大量货物运输",

            vector: [
                0.8,
                0.7,
                0.6,
                0.5
            ],

            metadata: {
                source: "物流知识库"
            }

        }

    ]);



    console.log("搜索...");


    const result =
        await store.search(

            [
                0.1,
                0.2,
                0.3,
                0.4
            ],

            2

        );


    console.log(
        "搜索结果:"
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