import React, { FC, useEffect, useState } from "react";
import DashboardPageLayout from "../layout/DashboardPageLayout";
import MarketingPageLayout from "../layout/MarketingPageLayout";

export type NotFoundPageProps = {

}

const NotFoundPage: FC<NotFoundPageProps> = (props) => {
    return <MarketingPageLayout>
        This page is not found.
    </MarketingPageLayout>
}

export default NotFoundPage;