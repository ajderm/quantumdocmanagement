/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

/**
 * Deliberately plain.
 *
 * An earlier version used hidden preview text, an embedded <style> block and a
 * styled button. That markup put content outside <body>, which some mail
 * clients and quarantine viewers strip entirely — the message then downloads
 * with a blank body — and the hidden text plus a big coloured link button are
 * classic spam signals. Everything here is visible, inside <body>, with inline
 * styles only.
 */
export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your sign-in code</Heading>
        <Text style={text}>
          Enter this code in the Document Engine panel to sign in to {siteName}.
        </Text>
        {token ? <Text style={codeStyle}>{token}</Text> : null}
        <Text style={text}>
          The code expires in one hour. If you did not request it, you can
          ignore this message.
        </Text>
        {confirmationUrl ? (
          <Text style={text}>
            Prefer a link? <Link href={confirmationUrl} style={link}>Sign in here</Link>.
          </Text>
        ) : null}
        <Text style={footer}>Quantum Document Management App</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#1b2a4a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const codeStyle = {
  fontSize: '28px',
  letterSpacing: '4px',
  fontWeight: '700' as const,
  color: '#1b2a4a',
  margin: '0 0 20px',
}
const link = { color: '#1b2a4a' }
const footer = { fontSize: '12px', color: '#888888', margin: '30px 0 0' }
