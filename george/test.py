import xml.etree.ElementTree as ET

def find_first_section_with_subsection(file_path):
    try:
        # Parse the XML file
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Find all section tags
        sections = root.findall('.//section')
        
        # Iterate through sections to find the first one with a subsection descendant
        for section in sections:
            # Check if this section has any subsection descendants
            subsections = section.findall('.//subsection')
            if subsections:  # If at least one subsection is found
                # Look for the header tag within this section
                header = section.find('header')
                if header is not None and header.text is not None:
                    print("Header of the first section with a subsection:")
                    print(header.text.strip())
                else:
                    print("No valid <header> found in the first section with a subsection.")
                return  # Exit after finding and processing the first matching section
        
        print("No section with a subsection was found.")
        
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
    except ET.ParseError:
        print(f"Error: The file '{file_path}' is not a valid XML file.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    find_first_section_with_subsection('bbb.xml')
#import xml.etree.ElementTree as ET
#
#def analyze_xml(file_path):
#    try:
#        # Parse the XML file
#        tree = ET.parse(file_path)
#        root = tree.getroot()
#        
#        # Helper function to check if an element has a specific tag as an ancestor
#        def has_ancestor(element, ancestor_tag, root_element):
#            # Find all elements with the ancestor tag
#            potential_ancestors = root_element.findall(f'.//{ancestor_tag}')
#            for ancestor in potential_ancestors:
#                # Check if the element is a descendant of this ancestor
#                for descendant in ancestor.iter():
#                    if descendant is element:
#                        return True
#            return False
#        
#        # Question 1: Do all <paragraph> tags have a <subsection> as their ancestor?
#        paragraphs = root.findall('.//paragraph')
#        all_paragraphs_have_subsection = True
#        if paragraphs:  # Only check if there are paragraph tags
#            all_paragraphs_have_subsection = all(has_ancestor(p, 'subsection', root) for p in paragraphs)
#        print("1. Do all <paragraph> tags have a <subsection> as their ancestor?")
#        print(f"   Answer: {all_paragraphs_have_subsection}")
#        print(f"   Found {len(paragraphs)} paragraph tags")
#        
#        # Question 2: Are any <subsection> tags a direct child of a <section>?
#        subsections_in_section = root.findall('.//section/subsection')
#        any_subsection_direct_child = len(subsections_in_section) > 0
#        print("\n2. Are any <subsection> tags a direct child of a <section>?")
#        print(f"   Answer: {any_subsection_direct_child}")
#        print(f"   Found {len(subsections_in_section)} subsection tags directly under section")
#        
#        # Question 3: Do all <subsection> tags have a <quoted-block> tag as their ancestor?
#        subsections = root.findall('.//subsection')
#        all_subsections_have_quoted_block = True
#        if subsections:  # Only check if there are subsection tags
#            all_subsections_have_quoted_block = all(has_ancestor(s, 'quoted-block', root) for s in subsections)
#        print("\n3. Do all <subsection> tags have a <quoted-block> tag as their ancestor?")
#        print(f"   Answer: {all_subsections_have_quoted_block}")
#        print(f"   Found {len(subsections)} subsection tags")
#        
#    except FileNotFoundError:
#        print(f"Error: The file '{file_path}' was not found.")
#    except ET.ParseError:
#        print(f"Error: The file '{file_path}' is not a valid XML file.")
#    except Exception as e:
#        print(f"An error occurred: {str(e)}")
#
#if __name__ == "__main__":
#    analyze_xml('bbb.xml')
