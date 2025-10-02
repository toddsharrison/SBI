import pandas as pd
import numpy as np
import pyodbc
#import adalimport pandas as pd
from fast_to_sql import fast_to_sql as fts

# Set up the connection string with the required parameters
server = r"THAR-5C85WT3-L\SQLEXPRESS"
database = 'Space_Data'
cnxn_string = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};trusted_connection=yes'

try:
    # Connect to the database
    cnxn = pyodbc.connect(cnxn_string)
    cursor = cnxn.cursor()
    cursor.fast_executemany = True
except Exception as e:
    print("Couldn't connect to the database. Please check the connection details.")
    print(e)

###################################
#   MCDOWELL LAUNCH LIST UPDATE
###################################

# URL of the spreadsheet to download and the table name to upload it into
url = 'https://www.planet4589.org/space/gcat/tsv/launch/launch.tsv'
table = 'McDowell_Launch_List'

# Download the spreadsheet and read it into a DataFrame
try:
    data = pd.read_csv(url, sep='\t', low_memory=False, usecols=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26])
except Exception as e:
    print("Couldn't download or read McDowell Launch List. Please check the URL.")
    print(e)

# Clean up the data
data.columns = data.columns.str.replace('#', '')
data = data.iloc[1:, :]  # Delete the first row
data = data.replace(['  ', '-', '      -'], np.nan)
data['Flight_ID'] = np.nan
convert_dict = {'Launch_JD': float, 'Apogee': float}
data = data.astype(convert_dict)

# Delete existing data
try:
    cursor.execute(f"DELETE FROM {table}")
    cnxn.commit()
except Exception as e:
    print("Couldn't delete the data from the McDowell Launch List table in the database. Please check the table's name.")
    print(e)

# Upload the data
try:
    create_statement = fts.fast_to_sql(data, table, cnxn, if_exists="append", custom=None, temp=False, copy=False)
    cnxn.commit()
    print('MCDOWELL LAUNCH LIST UPDATED')
    cursor.execute("select max( cast((case when Launch_Date not like '%Q%' and substring(Launch_Date, 10, 2) <> '' and substring(Launch_Date, 6, 3) <> '' then substring(Launch_Date, 10, 2) + '-' + substring(Launch_Date, 6, 3) + '-' + substring(Launch_Date, 1,4) \
            when substring(Launch_Date, 10, 2) = '' and Launch_Date not like '%Q%' and substring(Launch_Date, 6, 3) <> '' then '01-' + substring(Launch_Date, 6, 3) + '-' + substring(Launch_Date, 1,4) \
            else '01-01-' + substring(Launch_Date, 1,4) end) as date)) from McDowell_Launch_List")
    result = cursor.fetchall()
    if result:
        print('Most recent launch: ' + str(result[0][0]))
except Exception as e:
    print("Couldn't upload the McDowell Launch List data to the table. Please check the details.")
    print(e)
from fast_to_sql import fast_to_sql as fts

#########################################
#   MCDOWELL Satellite Catalog Update
#########################################

# URL of the spreadsheet to download and the table name to upload it into
url = 'https://www.planet4589.org/space/gcat/tsv/cat/satcat.tsv'
table = 'McDowell_Satellite_Catalog'

# Download the spreadsheet and read it into a DataFrame
try:
    data = pd.read_csv(url, sep='\t', low_memory=False, usecols=[0,1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41])
except Exception as e:
    print("Couldn't download or read McDowell Satellite Catalog. Please check the URL.")
    print(e)

# Clean the data
data.columns = data.columns.str.replace('#', '')
data = data.iloc[1:, :] #Delete the first row
data = data.replace('  ', '')
data = data.replace('-', np.nan)
data['Apogee'] = data['Apogee'].replace('Inf', np.nan)
data = data.replace('      -', np.nan)
data['Satcat'] = pd.to_numeric(data['Satcat'], errors='coerce')
data['Apogee'] = pd.to_numeric(data['Apogee'], errors='coerce')
convert_dict = {   'Satcat': float,
                    'Mass': float,
                    'DryMass': float,
                    'TotMass': float,
                    'Length': float,
                    'Diameter': float,
                    'Span': float,
                    'Perigee': float,
                    'Apogee': float,
                    'Inc': float}
data = data.astype(convert_dict)

# Delete existing data
try:
    cursor.execute(f"DELETE FROM {table}")
    cnxn.commit()
except Exception as e:
    print("Couldn't delete the data from the McDowell Satellite Catalog table in the database. Please check the table's name.")
    print(e)

# Upload the data
try:
    create_statement = fts.fast_to_sql(data, table, cnxn, if_exists="append", custom=None, temp=False, copy=False)
    cnxn.commit()
    print('MCDOWELL SATELLITE CATALOG UPDATED')
    cursor.execute("select max(case when right(LDate, 1) = '?' then convert(date, substring(LDate, 1, len(LDate)-1)) else convert(date, LDate) end) from McDowell_Satellite_Catalog")
    result = cursor.fetchall()
    if result:
        print('Most recent object launched: ' + str(result[0][0]))
except Exception as e:
    print("Couldn't upload the McDowell Satellite Catalog data to the table. Please check the details.")
    print(e)
from fast_to_sql import fast_to_sql as fts


#########################################
#   Celestrak Satellite Catalog
#########################################

# URL of the spreadsheet to download and the table name to upload it into
url = 'https://celestrak.org/pub/satcat.csv'
table = 'Celestrak_SATCAT'

# Download the spreadsheet and read it into a DataFrame
try:
    data = pd.read_csv(url)
except Exception as e:
    print("Couldn't download or read Celestrak SATCAT. Please check the URL.")
    print(e)

# Clean the data
data.columns = data.columns.str.replace('#', '')
data = data.replace('', np.nan)
convert_dict = {   'NORAD_CAT_ID': int,
                    'PERIOD': float,
                    'INCLINATION': float,
                    'APOGEE': float,
                    'PERIGEE': float,
                    'RCS': float}
data = data.astype(convert_dict)

# Delete existing data
try:
    cursor.execute(f"DELETE FROM {table}")
    cnxn.commit()
except Exception as e:
    print("Couldn't delete the data from the Celestrak SATCAT table in the database. Please check the table's name.")
    print(e)

# Upload the data
try:
    create_statement = fts.fast_to_sql(data, table, cnxn, if_exists="append", custom=None, temp=False, copy=False)
    cnxn.commit()
    print('CELESTRAK SATCAT UPDATED')
except Exception as e:
    print("Couldn't upload the Celestrak SATCAT data to the table. Please check the details.")
    print(e)
from fast_to_sql import fast_to_sql as fts


#########################################
#   McDowell Launch Sites
#########################################

# URL of the spreadsheet to download and the table name to upload it into
url = 'https://www.planet4589.org/space/gcat/tsv/tables/sites.tsv'
table = 'McDowell_Launch_Sites'

# Download the spreadsheet and read it into a DataFrame
try:
    data = pd.read_csv(url, sep='\t')
except Exception as e:
    print("Couldn't download or read McDowell Launch Sites. Please check the URL.")
    print(e)

# Clean the data
data.columns = data.columns.str.replace('#', '')
data = data.iloc[1:, :] #Delete the first row
data = data.replace('', np.nan)
data = data.replace('-', np.nan)
data = data.replace('*', np.nan)

convert_dict = {   'Longitude': float,
                    'Latitude': float,
                    'Error': float}
data = data.astype(convert_dict)

# Delete existing data
try:
    cursor.execute(f"DELETE FROM {table}")
    cnxn.commit()
except Exception as e:
    print("Couldn't delete the data from the McDowell Launch Sites table in the database. Please check the table's name.")
    print(e)

# Upload the data
try:
    create_statement = fts.fast_to_sql(data, table, cnxn, if_exists="append", custom=None, temp=False, copy=False)
    cnxn.commit()
    print('MCDOWELL LAUNCH SITES UPDATED')
except Exception as e:
    print("Couldn't upload the McDowell Launch Sites data to the table. Please check the details.")
    print(e)
from fast_to_sql import fast_to_sql as fts

#########################################
#   McDowell Organizations
#########################################

# URL of the spreadsheet to download and the table name to upload it into
url = 'https://www.planet4589.org/space/gcat/tsv/tables/orgs.tsv'
table = 'McDowell_Organizations'

# Download the spreadsheet and read it into a DataFrame
try:
    data = pd.read_csv(url, sep='\t')
except Exception as e:
    print("Couldn't download or read McDowell Organizations. Please check the URL.")
    print(e)

# Clean the data
data.columns = data.columns.str.replace('#', '')
data = data.iloc[1:, :] #Delete the first row
data = data.replace('', np.nan)
data = data.replace('-', np.nan)
data = data.replace('*', np.nan)

convert_dict = {   'Longitude': float,
                    'Latitude': float,
                    'Error': float}
data = data.astype(convert_dict)

# Delete existing data
try:
    cursor.execute(f"DELETE FROM {table}")
    cnxn.commit()
except Exception as e:
    print("Couldn't delete the data from the McDowell Organizations table in the database. Please check the table's name.")
    print(e)

# Upload the data
try:
    create_statement = fts.fast_to_sql(data, table, cnxn, if_exists="append", custom=None, temp=False, copy=False)
    cnxn.commit()
    print('MCDOWELL ORGANIZATIONS UPDATED')
except Exception as e:
    print("Couldn't upload the McDowell Organizations data to the table. Please check the details.")
    print(e)
from fast_to_sql import fast_to_sql as fts


#########################################
#   McDowell Payload Catalog
#########################################

# URL of the spreadsheet to download and the table name to upload it into
url = 'https://www.planet4589.org/space/gcat/tsv/cat/psatcat.tsv'
table = 'McDowell_Payloads'

# Download the spreadsheet and read it into a DataFrame
try:
    data = pd.read_csv(url, sep='\t', usecols=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,17,18,19,20,21,22,14,15,16,27])
except Exception as e:
    print("Couldn't download or read McDowell Payload Catalog. Please check the URL.")
    print(e)

# Clean the data
data.columns = data.columns.str.replace('#', '')
data = data.iloc[1:, :] #Delete the first row
data = data.replace('', np.nan)
data = data.replace('-', np.nan)
data = data.replace('*', np.nan)

convert_dict = {    'UNPeriod': float,
                    'UNPerigee': float,
                    'UNApogee': float,
                    'UNInc': float}
data = data.astype(convert_dict)

#Order the columns
columns_order = ['JCAT','Piece','Name','LDate','TLast','TOp','TDate','TF','Program','Plane','Att','Mvr','Class','Category','UNState','UNReg','UNPeriod','UNPerigee','UNApogee','UNInc','Result','Control','Discipline','Comment']
data = data[columns_order]

# Delete existing data
try:
    cursor.execute(f"DELETE FROM {table}")
    cnxn.commit()
except Exception as e:
    print("Couldn't delete the data from the McDowell Payload Catalog table in the database. Please check the table's name.")
    print(e)

# Upload the data
try:
    create_statement = fts.fast_to_sql(data, table, cnxn, if_exists="append", custom=None, temp=False, copy=False)
    cnxn.commit()
    print('MCDOWELL PAYLOAD CATALOG UPDATED')
except Exception as e:
    print("Couldn't upload the McDowell Payload Catalog data to the table. Please check the details.")
    print(e)
from fast_to_sql import fast_to_sql as fts

# Close the database connection
cursor.close()
cnxn.close()

