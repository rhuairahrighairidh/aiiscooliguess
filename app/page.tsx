/* eslint-disable @next/next/no-img-element */
// Define this when using the App router API
'use client';

// !!Useful links at the bottom!!
// import {DeepChat as DeepChatCore} from 'deep-chat'; <- type
import { RequestDetails } from 'deep-chat/dist/types/interceptors';
import styles from './style.module.css';
import dynamic from 'next/dynamic';

// Info to get a reference for the component:
// https://github.com/OvidijusParsiunas/deep-chat/issues/59#issuecomment-1839483469

// Info to add types to a component reference:
// https://github.com/OvidijusParsiunas/deep-chat/issues/59#issuecomment-1839487740

export default function Home() {
  // need to import the component dynamically as it uses the 'window' property
  const DeepChat = dynamic(() => import('deep-chat-react').then((mod) => mod.DeepChat), {
    ssr: false,
  });

  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.serverTitle}>AI Crypto Developer</h1>
        <p>Who needs developers when you have AI</p>
        <div className={styles.components}>
          {/* additionalBodyProps is used to set other properties that will be sent to the server along with the message:
            https://deepchat.dev/docs/connect#connect */}
          {/* by setting maxMessages requestBodyLimits to 0 or lower - each request will send full chat history:
            https://deepchat.dev/docs/connect/#requestBodyLimits */}
          <DeepChat
            style={{ borderRadius: '10px', width: '96vw', height: 'calc(100vh - 150px)', paddingTop: '10px' }}
            messageStyles={{ default: { shared: { innerContainer: { fontSize: '1rem' } } } }}
            inputAreaStyle={{ fontSize: '1rem' }}
            introMessage={{ text: 'I\'m your helpful AI smart contract assitant! Ask me how to deploy a memecoin.' }}
            connect={{ url: '/api/openai/chat-stream', stream: true, additionalBodyProps: { model: 'gpt-4o' } }}
            requestBodyLimits={{ maxMessages: -1 }}
            errorMessages={{ displayServiceErrorMessages: true }}
          />
        </div>

      </main>
    </>
  );
}
