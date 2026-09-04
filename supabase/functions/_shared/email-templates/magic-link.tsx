/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Your sign-in code for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your operator sign-in code</Heading>
        <Text style={text}>
          Enter this code in the Document Engine panel to sign in to {siteName}:
        </Text>
        {token ? <Text style={codeStyle}>{token}</Text> : null}
        <Text style={text}>
          It expires in one hour. If you did not request it, you can safely
          ignore this email.
        </Text>
        <Text style={text}>
          You can also use this link to log in directly:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          Quantum Document Management App — if you didn't request this code, no
          action is needed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1b2a4a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeStyle = {
  fontSize: '28px',
  letterSpacing: '4px',
  fontWeight: '700' as const,
  color: '#1b2a4a',
  textAlign: 'center' as const,
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#1b2a4a',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #1b2a4a',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #1b2a4a !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #1b2a4a !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #1b2a4a !important; }
`
