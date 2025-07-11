"""
Prompt templates for the PolGen CLI application.
"""

SUMMARY_PROMPT_TEMPLATE = """
You are a policy analyst preparing a technical summary on the following topic: {question}

Based on the provided context documents, create a comprehensive summary that includes:

1. **Key Frameworks and Standards**: Identify and describe the main technical frameworks, standards, or methodologies mentioned in the documents.

2. **Risks and Challenges**: Highlight the primary risks, challenges, or concerns raised in the documents.

3. **Stakeholder Positions**: Summarize the different perspectives and positions of various stakeholders (government, industry, civil society, etc.).

4. **Best Practices and Recommendations**: Extract any best practices, recommendations, or proposed solutions.

5. **International Perspectives**: If available, include relevant international models or approaches.

Context Documents:
{context}

Please provide a well-structured summary in Markdown format with clear headings and bullet points where appropriate. The summary should be informative, balanced, and suitable for policy makers.

Summary:
"""

DRAFTING_PROMPT_TEMPLATE = """
You are a senior policy advisor tasked with drafting a policy brief based on the following technical summary:

{summary}

Create a professional policy brief that includes:

# Policy Brief: AI Safety and Regulation Framework

## Executive Summary
[Provide a concise overview of the policy issue and proposed approach - 2-3 paragraphs]

## Background and Context
[Explain the current situation and why policy action is needed]

## Policy Objectives
[List 3-5 clear, measurable objectives]

## Proposed Policy Framework
[Detail the main components of the proposed policy, including:
- Regulatory structure
- Key provisions
- Implementation timeline
- Enforcement mechanisms]

## Stakeholder Impact Analysis
[Analyze how different groups will be affected:
- Industry/Private Sector
- Government Agencies
- Civil Society/Public
- International Partners]

## Implementation Considerations
[Address practical aspects:
- Resource requirements
- Potential challenges
- Risk mitigation strategies]

## Recommendations
[Provide 3-5 specific, actionable recommendations]

## Conclusion
[Summarize key points and next steps]

Please ensure the brief is:
- Professional and authoritative in tone
- Evidence-based (referencing the summary content)
- Balanced and considers multiple perspectives
- Action-oriented with clear recommendations
- Formatted in clean Markdown

Policy Brief:
""" 