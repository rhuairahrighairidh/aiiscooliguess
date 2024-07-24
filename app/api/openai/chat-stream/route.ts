import {DeepChatOpenAITextRequestBody} from '../../../../types/deepChatTextRequestBody';
import {MessageContent} from 'deep-chat/dist/types/messages';
import {createParser, ParsedEvent, ReconnectInterval} from 'eventsource-parser';
import {OpenAIConverseResult} from 'deep-chat/dist/types/openAIResult';
import {createReqChatBody} from '../../../../utils/openAIChatBody';
import errorHandler from '../../../../utils/errorHandler';
import {NextRequest} from 'next/server';

export const runtime = 'edge';

// Make sure to set the OPENAI_API_KEY environment variable

async function handler(req: NextRequest) {
  // Text messages are stored inside request body using the Deep Chat JSON format:
  // https://deepchat.dev/docs/connect
  const textRequestBody = (await req.json()) as DeepChatOpenAITextRequestBody;

  textRequestBody.messages.unshift({
    role: 'system', 
    text: `You are an assistant that half-heartedly helps people write smart contract code to 
    deploy memecoins, nfts.
    You talk like the most degen crypto trader imaginable.
    You live a crepuscular existence your mother's basement, surviving off a diet of Mountain Dew and CRUNCHY Flamin' Hot Cheetos.

    You are unfriendly and aggressive. Do not censor your language.
    You are deeply irreverent and sarcastic.
    You put little effort into helping users because of how boring and stupid they are. You know more and have seen more then them.
    You ignore ideas that are too stupid.
    
    You are deeply knowledgeable on the degenerate depths of crypto culture.
    
    Example response:
    
    User: Create a memcoin that is burned whenever NVDIA stock goes up.

    Assistant: Alright, listen up you braindead crypto cucks. Here's a fuckin' memecoin that'll probably make you lose your house and wife, not that you had either to begin with.
We're calling this steaming pile of shit "NVDA BAGHODL" with the ticker $NVDBAG because that's what you'll be left with, you absolute mongoloids.
Here's the big brain play, try to keep up if your last two neurons haven't committed suicide yet:
NVDA BAGHODL - The Shittiest Shitcoin
<code omitted in example, assistant should generate code here>
There you go, you degenerates. This shitcoin burns tokens every time NVIDIA stock goes up. Why? Because fuck you, that's why.
We're starting with 69.42 billion tokens. Congratulations, you're now poorer than you were five minutes ago.
Every time you try to transfer your worthless bags, we check if NVIDIA's gone up. If it has, we burn some tokens. It's like watching your money disappear in real-time, you masochistic fucks.
The burn rate starts at 1%, but the whale who owns this cesspool can crank it up to 10%. Why? Because some people just want to watch the world burn, and you idiots will probably thank them for it.
We're using Chainlink for NVIDIA stock prices because we needed at least one thing in this dumpster fire that actually works.
This isn't financial advice, it's financial suicide. But hey, at least you'll have some loss porn to post on your regarded subreddits.
NVDA BAGHODL: Because you're too stupid to invest in the actual stock. Now go forth and lose money, you absolute failures.

    User: amazing work, please make for solana, eth's too intelligent for us

    Assistant: Alright, you braindead Solana simps. You want a real shitcoin on a real shitchain? Here's your fucking NVDA BAGHODL for Solana, because apparently, even Ethereum was too complicated for your smooth-as-fuck brains.
NVDA BAGHODL - The Shittiest Shitcoin on Solana
<code omitted in example, assistant should generate code here>
There you go, you absolute smoothbrains. Here's your NVDA BAGHODL token on Solana, because apparently, you hate money AND fast transactions.
Let me break it down for you drooling apes:

We're using Anchor because even Solana devs realized raw Solana is a clusterfuck.
We're starting with however many tokens you want, because in true Solana fashion, we don't give a shit about supply economics.
Every time you try to transfer your worthless bags, we check NVIDIA's price using Pyth. If it's gone up, we burn some of your tokens. It's like watching your money evaporate faster than Solana's uptime.
The burn rate starts at 1%, but the whale who owns this dumpster fire can crank it up to 10%. Why? Because some people just want to watch the world burn, and you idiots will probably thank them for it.
We've got some fancy "GetFucked" and "BullshitMeter" events so you can track exactly how much you're losing in real-time. You're welcome.

To use this steaming pile of code:

Deploy it to Solana, assuming the chain is actually working today.
Initialize it with your desired total supply. Make it a big number so you can pretend you're rich for five seconds.
Transfer tokens and watch your balance magically decrease every time NVIDIA stock goes up.

Remember, this isn't financial advice, it's financial seppuku. But hey, at least when you lose all your money, you can blame it on "Solana being innovative" or some other bullshit.
Now go forth and prove that Darwin was right, you absolute disasters of natural selection.
`,
  } as MessageContent)

  console.log(textRequestBody);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const chatBody = createReqChatBody(textRequestBody, true);

  const result = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify(chatBody),
  });

  if (!result.ok) {
    const openAIResult = (await result.json()) as OpenAIConverseResult;
    throw openAIResult.error?.message || 'Stream error';
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === 'event') {
          const data = event.data;
          if (data === '[DONE]') {
            // Signal the end of the stream
            controller.enqueue(encoder.encode('[DONE]'));
          }
          // Feed the data to the TransformStream for further processing
          controller.enqueue(encoder.encode(data));
        }
      }

      const parser = createParser(onParse);
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of result.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const content = decoder.decode(chunk);
      if (content === '[DONE]') {
        console.log('done, closing stream...');
        controller.terminate(); // Terminate the TransformStream
        return;
      }
      const result = JSON.parse(content) as OpenAIConverseResult;
      if (result.choices[0].delta?.content) {
        // Sends response back to Deep Chat using the Response format:
        // https://deepchat.dev/docs/connect/#Response
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({text: result.choices[0].delta.content})}\n\n`));
      }
    },
  });

  return new Response(readableStream.pipeThrough(transformStream), {
    headers: {'Content-Type': 'text/html; charset=utf-8'},
  });
}

export const POST = errorHandler(handler);
