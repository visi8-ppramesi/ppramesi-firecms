import React from "react";
import { Box, CardMedia, Link, Tooltip, Typography } from "@mui/material";

import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { PreviewSize } from "../index";
import { ImagePreview } from "./ImagePreview";
import { getThumbnailMeasure } from "../util";
import { PreviewType } from "../../types";

/**
 * @category Preview components
 */
export function UrlComponentPreview({
                                        url,
                                        previewType,
                                        size,
                                        hint
                                    }: { url: string, previewType?: PreviewType, size: PreviewSize, hint?: string }): React.ReactElement {

    if (!previewType) {
        return (
            <Link sx={(theme) => ({
                display: "flex",
                wordBreak: "break-word",
                fontWeight: theme.typography.fontWeightMedium
            })}
                  href={url}
                  onMouseDown={(e: React.MouseEvent) => {
                      e.preventDefault();
                  }}
                  target="_blank">
                <OpenInNewIcon style={{ marginRight: 8 }} fontSize={"small"}/>
                {url}
            </Link>
        );
    }

    if (previewType === "image") {
        return <ImagePreview key={`image_preview_${url}_${size}`}
                             url={url}
                             size={size}/>;
    } else if (previewType === "audio") {
        return <audio controls
                      src={url}
                      key={`audio_preview_${url}_${size}`}>
            Your browser does not support the
            <code>audio</code> element.
        </audio>;
    } else if (previewType === "video") {
        return <CardMedia
            key={`video_preview_${url}_${size}`}
            sx={{ maxWidth: size === "small" ? 300 : 500 }}
            component="video"
            controls
            image={url}
        />;
    } else {
        return (
            <a
                key={`link_preview_${url}_${size}`}
                href={url}
                rel="noopener noreferrer"
                target="_blank"
                onClick={(e) => e.stopPropagation()}>
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: getThumbnailMeasure(size),
                    height: getThumbnailMeasure(size)
                }}>
                    <DescriptionOutlinedIcon sx={{ flexGrow: 1 }}/>
                    {hint &&
                        <Tooltip title={hint}>
                            <Typography
                                sx={{
                                    maxWidth: "100%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    direction: "rtl",
                                    textAlign: "left"
                                }}
                                variant={"caption"}>{hint}</Typography>
                        </Tooltip>}
                </Box>
            </a>
        );
    }
}
