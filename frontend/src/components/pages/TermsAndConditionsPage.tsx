import React, { FC, useEffect, useState } from "react";
import { CircularProgress, Container } from "@mui/material";
import ReactMarkdown from "react-markdown";
import termsAndConditionsText from '../../assets/text/terms-and-conditions.md';
import MarketingPageLayout from "../layout/MarketingPageLayout";

export type TermsAndConditionsPageProps = {
    
}

const TermsAndConditionsPage: FC<TermsAndConditionsPageProps> = (props) => {
    let [ content, setContent] = useState<string|null>(null);

    useEffect(()=> {
      fetch(termsAndConditionsText).then(async (res) => {
          setContent(await res.text())
      })
    }, [])

    return <MarketingPageLayout>
            <Container>
            {content !== null ? <ReactMarkdown>{content}</ReactMarkdown> : <CircularProgress />}
        </Container>
    </MarketingPageLayout>
}

export default TermsAndConditionsPage;