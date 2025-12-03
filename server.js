require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));
app.use(express.static("public"));

app.post("/process-image", async (req, res) => {
    const imageBase64 = req.body.image;

    try {
        const result = await axios.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                contents: [
                    {
                        parts: [
                            {
                                text: "Analyze the screenshot and provide only the answer to the question according to the options. Don't write 'The answer is' or 'The answer to the question is', just provide the answer. ONLY if the question explicitly contains text like '(Choose two.)' or '(Choose three.)', add the total count in braces like {2} or {3} at the end of your response."
                            },
                            {
                                inlineData: {
                                    mimeType: "image/png",
                                    data: imageBase64
                                }
                            }
                        ]
                    }
                ]
            },
            {
                params: { key: process.env.GEMINI_API_KEY }
            }
        );

        const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No result";

        res.json({ result: text });

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.json({ result: "Error processing image" });
    }
});

app.post("/get-answer-by-position", async (req, res) => {
    const { image, position } = req.body;

    try {
        const result = await axios.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                contents: [
                    {
                        parts: [
                            {
                                text: `Analyze the screenshot and provide only the answer that is in position ${position} from the top (counting from 1). Don't write 'The answer is', just provide the answer text. ONLY if the question contains '(Choose two.)' or '(Choose three.)' etc., and there are more answers remaining after this one, add the remaining count in braces like {1} at the end.`
                            },
                            {
                                inlineData: {
                                    mimeType: "image/png",
                                    data: image
                                }
                            }
                        ]
                    }
                ]
            },
            {
                params: { key: process.env.GEMINI_API_KEY }
            }
        );

        const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No result";

        res.json({ result: text });

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.json({ result: "Error processing image" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
